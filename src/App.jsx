import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, Download } from 'lucide-react';
import JSZip from 'jszip';

// Add CSS styles at the top (unchanged)
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

  // Function to properly handle special characters in filenames
  const cleanFilename = (text) => {
    if (!text) return '';
    
    // First normalize the text to decompose accented characters
    // and replace diacritics with their base characters
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics but keep base characters
      .replace(/[^a-zA-Z0-9]/g, '-')   // Replace other non-alphanumeric with hyphens
      .replace(/-+/g, '-')             // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '');          // Remove leading and trailing hyphens
  };

  // Extract image URLs from Airtable format
  const extractImageUrls = (imageField) => {
    if (!imageField || typeof imageField !== 'string') return [];
    
    // Match all URLs in the format (https://...)
    const urlMatches = imageField.match(/\(https:\/\/[^)]+\)/g) || [];
    
    // Extract URLs from matches by removing parentheses
    return urlMatches.map(match => match.slice(1, -1));
  };

  // Preprocess CSV text to handle complex quotes better
  const preprocessCsvText = (text) => {
    // Handle the specific problematic row with the marble torso
    let processedText = text;
    
    // Find and fix problematic quotes in title fields
    const marbleRegex = /(".*?One Marble Torso Of An Athlete, Hero or God\. Roman, Ca\..*?")/g;
    processedText = processedText.replace(marbleRegex, (match) => {
      // Clean up nested quotes by replacing them with single quotes
      return match.replace(/""([^"]*)""/, "'$1'");
    });
    
    return processedText;
  };

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

      // Preprocess the text to handle special cases
      const processedText = preprocessCsvText(text);
      
      setStatus('Parsing CSV...');

      const parseResult = Papa.parse(processedText, {
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
      
      // Debug: Log the headers found
      console.log('CSV Headers found:', parseResult.meta.fields);
      
      // Look for special cases
      const marbleRow = parseResult.data.find(row => 
        (row['Title (from Artwork)'] || '').includes('Marble Torso') ||
        (row['Name'] || '').includes('Marble Torso')
      );
      
      if (marbleRow) {
        console.log('Found row with Marble Torso:', marbleRow);
      }

      const processedData = parseResult.data.map((row, index) => {
        // Special handling for the problematic row
        let title = row['Title (from Artwork)'] || row['Name'] || '';
        
        // Special case for the Marble Torso
        if (title.includes('Marble Torso') && title.includes('Roman')) {
          console.log('Processing special case for Marble Torso');
          // Remove excessive quotes and normalize
          title = title.replace(/^"+|"+$/g, '').replace(/"{2,}/g, '"');
          console.log('Cleaned title:', title);
        }

        // Handle multiple image URLs
        const imageField = row['Images (from Artwork)'] || row['Attachments'] || '';
        const imageUrls = extractImageUrls(imageField);
        const primaryImageUrl = imageUrls.length > 0 ? imageUrls[0] : '';
        
        // Clean artist and title for filename using our improved function
        const artist = row['Artist (from Artwork)'] || '';
        const cleanArtist = cleanFilename(artist);
        const cleanTitle = cleanFilename(title);
        
        // Get project folder - check multiple possible field names
        const projectFolder = row['Project ID #'] || row['Project Code'] || projectCode || 'UNKNOWN_PROJECT';
        
        // Create full Google Drive path for the image
        const fullPath = `${basePath}/${projectFolder}/thumbs/${cleanArtist}_${cleanTitle}.jpg`;
          
        return {
          'Artist': artist.trim(),
          'Title': title.trim(),
          'Date': (row['Date (from Artwork)'] || row['Date'] || '').trim(),
          'Medium': (row['Medium (from Artwork)'] || row['Medium'] || '').trim(),
          'Dimensions': (row['Dimensions (from Artwork)'] || row['Dimensions'] || '').trim(),
          'Location': (row['Location'] || '').trim(),
          'Edition': (row['Edition (from Artwork)'] || row['Edition'] || '').toString(),
          'Alt Dimensions 1 (h x w)': (row['Alt Dimensions 1 (h x w) (from Artwork)'] || '').trim(),
          'Alt Dimensions 2 (h x w)': (row['Alt Dimensions 2 (h x w) (from Artwork)'] || '').trim(),
          'Signature / Inscriptions / Labels': (row['Signature & Inscription (from Artwork)'] || '').trim(),
          'Provenance': (row['Provenance (from Artwork)'] || row['Provenance'] || '').toString().trim(),
          'Exhibitions': (row['Exhibitions (from Artwork)'] || row['Exhibitions'] || '').trim(),
          'Publications': (row['Publications (from Artwork)'] || row['Publications'] || '').toString().trim(),
          'Condition': (row['Condition'] || '').toString().trim(),
          'Artwork Cataloguing': (row['Object ID#'] || row['ID'] || '').trim(),
          '@imageFilePath': fullPath,
          '_originalImageUrl': primaryImageUrl,
          '_filename': `${cleanArtist}_${cleanTitle}.jpg`,
          '_projectFolder': projectFolder,
          '_fullPath': fullPath,
          '_allImageUrls': imageUrls
        };
      });

      const validData = processedData.filter(row => {
        const isValid = row.Artist || row.Title; // Make this logic more flexible
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
        const { _originalImageUrl, _filename, _projectFolder, _fullPath, _allImageUrls, ...cleanRow } = row;
        
        // Extra cleaning for all string values
        Object.keys(cleanRow).forEach(key => {
          if (typeof cleanRow[key] === 'string') {
            // Remove any remaining carriage returns and line breaks
            cleanRow[key] = cleanRow[key].replace(/[\r\n]+/g, ' ');
            // Remove extra spaces
            cleanRow[key] = cleanRow[key].replace(/\s+/g, ' ').trim();
          }
        });
        
        return cleanRow;
      }), {
        quotes: true,    // Quote all fields
        escapeChar: '"', // Use double quotes to escape quotes
        BOM: false
      });
      
      setCsvContent(indesignCSV);
      
      // Collect all image URLs for downloading
      const allImages = [];
      validData.forEach(row => {
        if (row._allImageUrls && row._allImageUrls.length > 0) {
          row._allImageUrls.forEach((url, i) => {
            // For multiple images from the same artwork, add index to filename
            const suffix = i > 0 ? `_${i+1}` : '';
            allImages.push({
              url: url,
              filename: `${row._filename.replace('.jpg', '')}${suffix}.jpg`,
              projectFolder: row._projectFolder
            });
          });
        } else if (row._originalImageUrl) {
          allImages.push({
            url: row._originalImageUrl,
            filename: row._filename,
            projectFolder: row._projectFolder
          });
        }
      });
      
      setImageUrls(allImages.filter(item => item.url));

      setStats({
        totalRows: parseResult.data.length,
        validRows: validData.length,
        imagesFound: allImages.filter(item => item.url).length,
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
    
    // Log the number of images to download
    console.log(`Downloading ${imageUrls.length} images`);
    
    for (const [index, image] of imageUrls.entries()) {
      try {
        setStatus(`Downloading image ${index + 1} of ${imageUrls.length}...`);
        console.log(`Downloading image ${index + 1}: ${image.url}`);
        
        const response = await fetch(image.url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        
        console.log(`Successfully downloaded ${image.filename}`);
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