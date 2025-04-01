import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, Download } from 'lucide-react';
import JSZip from 'jszip';

// Add CSS styles at the top
const styles = `
/* Bodoni font import */
@import url('https://indestructibletype.com/fonts/Bodoni/Bodoni.css');

body {
  color: #213547;
  background-color: #F7F6F5;
  font-family: 'Bodoni 6', 'Bodoni MT', 'Bodoni', 'Didot', 'Times New Roman', serif;
  margin: 0;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: flex;
  justify-content: center;
}

h3 {
  font-family: 'Bodoni 6', 'Bodoni MT', 'Bodoni', 'Didot', 'Times New Roman', serif;
  font-weight: 500;
  margin-bottom: 12px;
  color: #2E2E2E;
  font-size: 18px;
  border-bottom: 0.25px solid #2E2E2E;
  padding-bottom: 10px;
}

input, button {
  font-family: 'Bodoni 6', 'Bodoni MT', 'Bodoni', 'Didot', 'Times New Roman', serif;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header img {
  max-width: 300px;
  margin-bottom: 20px;
}

.header-subtitle {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #666666;
  border-top: 0.25px solid #2E2E2E;
  padding-top: 10px;
}

.input-group {
  margin-bottom: 24px;
  width: 100%;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #D1D5DB;
  font-size: 16px;
  background-color: white;
  transition: border-color 0.2s;
  font-family: 'Bodoni 6', 'Bodoni MT', 'Bodoni', 'Didot', 'Times New Roman', serif;
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
}

.input-help {
  font-size: 14px;
  color: #666666;
  margin-top: 6px;
  line-height: 1.6;
}

.drop-zone {
  border: 2px dashed #D1D5DB;
  padding: 32px 20px;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 24px;
  transition: all 0.2s;
  background-color: white;
}

.drop-zone:hover {
  border-color: #2E2E2E;
  background-color: #F8FAFC;
}

.icon-container {
  margin: 0 auto;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-box {
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 16px;
  line-height: 1.6;
}

.error-box {
  background-color: #FEF2F2;
  border: 1px solid #EF4444;
}

.status-box {
  background-color: #f0efee;
  border: 1px solid #D1D5DB;
}

.message-title {
  margin: 0 0 10px 0;
  font-weight: 500;
  font-size: 16px;
}

.message-content {
  margin: 0;
  white-space: pre-line;
  color: #333333;
}

.error-title {
  color: #DC2626;
}

.button {
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  border: none;
  color: white;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.button-primary {
  background-color: #2E2E2E;
}

.button-primary:hover {
  background-color: #444444;
}

.button-success {
  background-color: #2E2E2E;
}

.button-success:hover {
  background-color: #444444;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-list {
  margin: 0;
  padding-left: 24px;
  color: #333333;
}

.stats-list li {
  margin-bottom: 8px;
}

.footer {
  margin-top: 40px;
  border-top: 0.25px solid #dddddd;
  padding-top: 20px;
  text-align: center;
  font-size: 12px;
  color: #999999;
}
`;

function App() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [csvContent, setCsvContent] = useState(null);
  const [imageUrls, setImageUrls] = useState([]);
  const [basePath, setBasePath] = useState('');
  const [projectCode, setProjectCode] = useState('');

  const processCSV = async (file) => {
    if (!basePath) {
      setError('Please enter the Google Drive file path before processing.');
      return;
    }
    
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
        transformHeader: header => header.trim(),
        transform: value => {
          // Replace carriage returns and line breaks with spaces
          if (typeof value === 'string') {
            // Remove hidden carriage returns and line breaks, replace with space
            value = value.replace(/[\r\n]+/g, ' ');
            // Trim extra spaces
            value = value.trim();
          }
          return value;
        }
      });

      setStatus('Processing rows...');
      
      // Debug: Log the headers we found
      console.log('CSV Headers found:', parseResult.meta.fields);
      // Debug: Log the first row of data
      console.log('First row of data:', parseResult.data[0]);

      const processedData = parseResult.data.map((row, index) => {
        // Safely access and process the image URL
        let imageUrl = '';
        try {
          if (row['Images (from Artwork)']) {
            const match = row['Images (from Artwork)'].match(/\(https:\/\/.*?\)/);
            if (match) {
              imageUrl = match[0].slice(1, -1);
            }
          }
        } catch (err) {
          console.error(`Error processing image URL for row ${index}:`, err);
        }
        
        // Clean artist and title for filename, but preserve accented characters
        const cleanArtist = (row['Artist (from Artwork)'] || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics but keep base characters
          .replace(/[^a-zA-Z0-9]/g, '-');  // Replace other non-alphanumeric with hyphens
        const cleanTitle = (row['Title (from Artwork)'] || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics but keep base characters
          .replace(/[^a-zA-Z0-9]/g, '-');  // Replace other non-alphanumeric with hyphens
        const projectFolder = row['Project ID #'] || projectCode || 'UNKNOWN_PROJECT';
        
        // Create full Google Drive path for the image
        const fullPath = `${basePath}/thumbs/${cleanArtist}_${cleanTitle}.jpg`;
          
        return {
          'Artist': row['Artist (from Artwork)']?.trim(),
          'Title': row['Title (from Artwork)']?.trim(),
          'Date': row['Date (from Artwork)']?.trim(),
          'Medium': row['Medium (from Artwork)']?.trim(),
          'Dimensions': row['Dimensions (from Artwork)']?.trim(),
          'Location': row['Location']?.trim(),
          'Edition': row['Edition (from Artwork)']?.toString(),
          'Alt Dimensions 1 (h x w)': row['Height In. (from Artwork)'] && row['Width In. (from Artwork)'] ? 
            `${row['Height In. (from Artwork)']} x ${row['Width In. (from Artwork)']}` : '',
          'Alt Dimensions 2 (h x w)': row['Depth In. (from Artwork)'] ? 
            `${row['Depth In. (from Artwork)']}` : '',
          'Signature / Inscriptions / Labels': row['Signature & Inscription (from Artwork)']?.trim(),
          'Provenance': row['Provenance (from Artwork)']?.toString().trim(),
          'Exhibitions': row['Exhibitions (from Artwork)']?.trim(),
          'Publications': row['Publications (from Artwork)']?.toString().trim(),
          'Condition': row['Condition (from Artwork)']?.toString().trim(),
          'Artwork Cataloguing': row['Object ID#']?.trim(),
          '@imageFilePath': fullPath,
          '_originalImageUrl': imageUrl,
          '_filename': `${cleanArtist}_${cleanTitle}.jpg`,
          '_projectFolder': projectFolder,
          '_fullPath': fullPath
        };
      });

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
        
        // Extra cleaning for all string values but preserve special characters
        Object.keys(cleanRow).forEach(key => {
          if (typeof cleanRow[key] === 'string') {
            // Remove any remaining carriage returns and line breaks
            cleanRow[key] = cleanRow[key].replace(/[\r\n]+/g, ' ');
            // Remove extra spaces
            cleanRow[key] = cleanRow[key].replace(/\s+/g, ' ').trim();
            // Ensure proper encoding of special characters
            cleanRow[key] = cleanRow[key]
              .normalize('NFC'); // Normalize to composed form for consistent display
          }
        });
        
        return cleanRow;
      }), {
        // Ensure UTF-8 encoding by specifying BOM: false
        BOM: false
      });
      
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
    const mainFolder = zip.folder('thumbs');
    
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
    a.download = 'thumbs.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus(`Downloads complete! Successfully downloaded ${successCount} images. ${failCount ? `Failed to download ${failCount} images.` : ''}\n\nIMPORTANT: Extract the zip file to: ${basePath}`);
  };

  // Optional helper to generate example path from project code
  const getExamplePath = () => {
    if (!projectCode) return "/Users/tobiasczudej/Library/CloudStorage/GoogleDrive-tobias@czudejmcdonough.com/Shared drives/Czudej McDonough/01 Appraisals/02 In Progress/NY/BLAK202501";
    
    return `/Users/username/Google Drive/Shared drives/YourCompany/Projects/${projectCode}`;
  };

  return (
    <>
      <style>{styles}</style>
      <link rel="stylesheet" href="https://indestructibletype.com/fonts/Bodoni/Bodoni.css" type="text/css" charSet="utf-8" />
      <div className="container">
        <div className="header">
          <img src="https://i.imgur.com/NUSPqvj.png" alt="Czudej McDonough Fine Art Appraisal" />
          <div className="header-subtitle">
            AIRTABLE CSV PROCESSOR
          </div>
        </div>

        <div className="input-group">
          <h3>Project Code</h3>
          <input 
            type="text" 
            className="input-field"
            value={projectCode}
            onChange={(e) => setProjectCode(e.target.value)}
            placeholder="e.g., KOZL202501"
          />
        </div>

        <div className="input-group">
          <h3>Google Drive Base Path</h3>
          <input 
            type="text" 
            className="input-field"
            value={basePath}
            onChange={(e) => setBasePath(e.target.value)}
            placeholder="Enter the full path to your project folder"
          />
          <p className="input-help">
            Enter the full path to your project folder. For example: {getExamplePath()}
            <br />
            Download images and place "thumbs" folder at this location.
          </p>
        </div>

        <div className="drop-zone">
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
            <div className="icon-container">
              <Upload size={36} color="#2E2E2E" />
            </div>
            <p style={{ marginTop: '10px', color: '#2E2E2E', fontWeight: 500 }}>
              Click to upload your Airtable CSV file
            </p>
            <p style={{ fontSize: '14px', color: '#666666' }}>
              {processing ? 'Processing...' : 'Choose a file to begin'}
            </p>
          </label>
        </div>

        {error && (
          <div className="message-box error-box">
            <h4 className="message-title error-title">Error</h4>
            <p className="message-content" style={{ color: '#DC2626' }}>{error}</p>
          </div>
        )}

        {status && (
          <div className="message-box status-box">
            <h4 className="message-title">Status</h4>
            <p className="message-content">{status}</p>
          </div>
        )}

        {stats && (
          <div className="message-box status-box">
            <h4 className="message-title">Processing Complete</h4>
            <ul className="stats-list">
              <li>Total rows processed: {stats.totalRows}</li>
              <li>Valid entries found: {stats.validRows}</li>
              <li>Images found: {stats.imagesFound}</li>
              <li>Projects: {stats.projects.join(', ')}</li>
            </ul>
          </div>
        )}

        {csvContent && (
          <div className="button-group">
            <button
              onClick={downloadCSV}
              className="button button-primary"
            >
              <Download size={20} />
              DOWNLOAD INDESIGN CSV
            </button>
            
            <button
              onClick={downloadImages}
              className="button button-success"
            >
              <Download size={20} />
              DOWNLOAD ALL IMAGES ({stats?.imagesFound} FILES)
            </button>
          </div>
        )}
        
        <div className="footer">
          © {new Date().getFullYear()} Czudej McDonough<br/>
          Fine Art Appraisal Services
        </div>
      </div>
    </>
  );
}

export default App;