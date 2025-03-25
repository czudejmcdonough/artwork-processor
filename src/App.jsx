import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, Download } from 'lucide-react';
import JSZip from 'jszip';

function App() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [csvContent, setCsvContent] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [basePath, setBasePath] = useState('/Users/tobiasczudej/Library/CloudStorage/GoogleDrive-tobias@czudejmcdonough.com/Shared drives/Czudej McDonough/01 Appraisals/02 In Progress/NY/KOZL202401');

  const processCSV = async (file) => {
    console.log('Starting to process file:', file.name);
    setProcessing(true);
    setError('');
    setStatus('Reading file...');
    
    try {
      const text = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
      });

      setStatus('Parsing CSV...');

      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: header => header.trim()
      });

      setStatus('Processing rows...');
      
      // Debug: Log the headers we found
      console.log('CSV Headers found:', parseResult.meta.fields);
      // Debug: Log the first row of data
      console.log('First row of data:', parseResult.data[0]);

      const processedData = parseResult.data.map((row, index) => {
        try {
          const imageUrlMatch = row.Images ? 
            row.Images.match(/\(https:\/\/.*?\)/) : null;
          const imageUrl = imageUrlMatch ? 
            imageUrlMatch[0].slice(1, -1) : '';
            
          const cleanArtist = (row['Artist  / Object'] || '').replace(/[^a-zA-Z0-9]/g, '-');
          const cleanTitle = (row.Title || '').replace(/[^a-zA-Z0-9]/g, '-');
          const projectFolder = row.Project || 'UNKNOWN_PROJECT';
          
          // Create full Google Drive path for the image
          const fullPath = `${basePath}/artwork-images/${cleanArtist}_${cleanTitle}.jpg`;
            
          return {
            'Artist': row['Artist  / Object']?.trim(),
            'Title': row.Title?.trim(),
            'Date': row.Date?.trim(),
            'Medium': row.Medium?.trim(),
            'Dimensions': row.Dimensions?.trim(),
            'Edition': row.Edition?.toString(),
            'Alt Dimensions 1 (h x w)': row['Alt Dimensions 1 (h x w)']?.toString().trim(),
            'Alt Dimensions 2 (h x w)': row['Alt Dimensions 2 (h x w)']?.toString().trim(),
            'Signature / Inscriptions / Labels': row['Signature / Inscriptions / Labels']?.trim(),
            'Provenance': row.Provenance?.toString().trim(),
            'Exhibitions': row.Exhibitions?.trim(),
            'Publications': row.Publications?.toString().trim(),
            'Condition': row.Condition?.toString().trim(),
            'Artwork Cataloguing': row['Artwork Cataloguing']?.trim(),
            '@imageFilePath': fullPath,  // Column header starts with @ but path doesn't
            '_originalImageUrl': imageUrl,
            '_filename': `${cleanArtist}_${cleanTitle}.jpg`,
            '_projectFolder': projectFolder,
            '_fullPath': fullPath  // Store the full path for reference
          };
        } catch (err) {
          console.error(`Error processing row ${index}:`, err);
          return null;
        }
      }).filter(row => row !== null);

      const validData = processedData.filter(row => {
        const isValid = row.Artist && row.Title;
        if (!isValid) {
          console.log('Invalid row found:', row);
        }
        return isValid;
      });

      if (validData.length === 0) {
        setError('No valid data found in CSV. Please check the file format.');
        return;
      }

      // Generate CSV with the correct Google Drive filepaths
      const indesignCSV = Papa.unparse(validData.map(row => {
        const { _originalImageUrl, _filename, _projectFolder, _fullPath, ...cleanRow } = row;
        return cleanRow;
      }));
      
      setCsvContent(indesignCSV);
      setImageUrls(validData.map(row => ({
        url: row._originalImageUrl,
        filename: row._filename,
        projectFolder: row._projectFolder
      })).filter(item => item.url));

      setStats({
        totalRows: parseResult.data.length,
        validRows: validData.length,
        imagesFound: validData.filter(row => row._originalImageUrl).length,
        projects: [...new Set(validData.map(row => row._projectFolder))]
      });

      setStatus('Ready! Click the buttons below to download your files.');

    } catch (error) {
      console.error('Processing error:', error);
      setError(`Error processing file: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const downloadCSV = () => {
    if (!csvContent) return;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'indesign-ready.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadImages = async () => {
    setStatus('Starting image downloads...');
    let successCount = 0;
    let failCount = 0;
    const zip = new JSZip();

    // Process the images
    const mainFolder = zip.folder('artwork-images');
    
    for (const [index, image] of imageUrls.entries()) {
      try {
        setStatus(`Downloading image ${index + 1} of ${imageUrls.length}...`);
        const response = await fetch(image.url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        mainFolder.file(image.filename, blob);
        successCount++;
      } catch (error) {
        console.error(`Failed to download ${image.filename}:`, error);
        failCount++;
      }
    }

    setStatus('Creating zip file...');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'artwork-images.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus(`Downloads complete! Successfully downloaded ${successCount} images. ${failCount ? `Failed to download ${failCount} images.` : ''}\n\nIMPORTANT: Extract the zip file to: ${basePath}`);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px' }}>Google Drive Base Path:</h3>
        <input 
          type="text" 
          value={basePath}
          onChange={(e) => setBasePath(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px'
          }}
        />
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          This is where you'll extract the zip file. The CSV will reference images at this location.
        </p>
      </div>

      <div style={{ 
        border: '2px dashed #ccc', 
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            console.log('File selected:', e.target.files?.[0]);
            e.target.files?.[0] && processCSV(e.target.files[0]);
          }}
          style={{ display: 'none' }}
          id="csv-upload"
        />
        <label htmlFor="csv-upload" style={{ cursor: 'pointer' }}>
          <Upload style={{ margin: '0 auto', width: '48px', height: '48px', color: '#666' }} />
          <p style={{ marginTop: '10px', color: '#666' }}>
            Click to upload your Airtable CSV file
          </p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            {processing ? 'Processing...' : 'Choose a file to begin'}
          </p>
        </label>
      </div>

      {error && (
        <div style={{ 
          backgroundColor: '#fee2e2', 
          border: '1px solid #ef4444',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <h4 style={{ margin: '0 0 5px 0', color: '#dc2626' }}>Error</h4>
          <p style={{ margin: 0, color: '#dc2626' }}>{error}</p>
        </div>
      )}

      {status && (
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <h4 style={{ margin: '0 0 5px 0' }}>Status</h4>
          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{status}</p>
        </div>
      )}

      {stats && (
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <h4 style={{ margin: '0 0 5px 0' }}>Processing Complete</h4>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li>Total rows processed: {stats.totalRows}</li>
            <li>Valid entries found: {stats.validRows}</li>
            <li>Images found: {stats.imagesFound}</li>
            <li>Projects: {stats.projects.join(', ')}</li>
          </ul>
        </div>
      )}

      {csvContent && (
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <button
            onClick={downloadCSV}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Download size={20} />
            Download InDesign CSV
          </button>
          
          <button
            onClick={downloadImages}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Download size={20} />
            Download All Images ({stats?.imagesFound} files)
          </button>
        </div>
      )}
    </div>
  );
}

export default App;