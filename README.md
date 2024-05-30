# GDrive Node Service Uploader

Programmatically upload, download, and manage files on Google Drive using Node.js.

## Features

- **Upload Files**: Seamlessly upload files to Google Drive.
- **Download Files**: Download files from Google Drive to your local system.
- **Delete Files**: Remove files from Google Drive.
- **Progress Tracking**: Track the progress of upload and download operations.

## Installation

```bash
npm install gdrive-node-service-uploader
```

## Usgit 

### Prerequisites

Ensure you have a Google Service Account and the credentials JSON file. Set the path to your credentials file in the environment variable `SERVICE_ACCOUNT_KEY_FILE`.

### Setup

1. **Upload a File**

```typescript
import { uploadFileToGoogleDrive } from 'gdrive-node-service-uploader';

const filePath = 'path/to/your/file.zip';

uploadFileToGoogleDrive({
  filePath,
  onProgress: (progress) => {
    console.log(`Upload Progress: ${progress}%`);
  }
}).then((result) => {
  console.log('Upload result:', result);
});
```

2. **Download a File**

```typescript
import { downloadFileFromGoogleDrive } from 'gdrive-node-service-uploader';

const fileId = 'your-file-id';
const downloadPath = 'path/to/download/location.zip';

downloadFileFromGoogleDrive({
  fileId,
  downloadPath,
  onProgress: (progress) => {
    console.log(`Download Progress: ${progress}%`);
  }
}).then((result) => {
  console.log('Download result:', result);
});
```

3. **Delete a File**

```typescript
import { deleteFileFromGoogleDrive } from 'gdrive-node-service-uploader';

const fileId = 'your-file-id';

deleteFileFromGoogleDrive({ fileId }).then((result) => {
  console.log('Delete result:', result);
});
```

### Example

An example script to upload, download, and delete a file:

```typescript
import path from 'path';
import ProgressBar from 'progress';
import { uploadFileToGoogleDrive, downloadFileFromGoogleDrive, deleteFileFromGoogleDrive } from 'gdrive-node-service-uploader';

const uploadAndDownloadExample = async () => {
  const baseDir = path.resolve(__dirname, '..');
  const filePath = path.join(baseDir, 'example_archive.zip');
  const downloadPath = path.join(baseDir, 'example_archive_downloaded.zip');

  try {
    const uploadProgressBar = new ProgressBar('Uploading [:bar] :percent :etas', {
      total: 100,
      width: 40,
      complete: '=',
      incomplete: ' ',
    });

    const uploadResult = await uploadFileToGoogleDrive({
      filePath,
      onProgress: (progress) => {
        uploadProgressBar.update(progress / 100);
      },
    });
    console.log('\nUpload result:', uploadResult);

    if (uploadResult.status) {
      console.log('File uploaded successfully. Initiating download...');

      const downloadProgressBar = new ProgressBar('Downloading [:bar] :percent :etas', {
        total: 100,
        width: 40,
        complete: '=',
        incomplete: ' ',
      });

      const downloadResult = await downloadFileFromGoogleDrive({
        fileId: uploadResult.downloadUrl.split('/')[5],
        downloadPath,
        onProgress: (progress) => {
          downloadProgressBar.update(progress / 100);
        },
      });

      console.log('\nDownload result:', downloadResult);

      if (downloadResult.status) {
        console.log('File downloaded successfully. Initiating deletion...');

        const deleteResult = await deleteFileFromGoogleDrive({
          url: uploadResult.downloadUrl,
        });

        console.log('Delete result:', deleteResult);
      } else {
        console.error('Download failed. Skipping deletion.');
      }
    } else {
      console.error('Upload failed. Skipping download and deletion.');
    }
  } catch (error) {
    console.error('Error during file operations:', error);
  }
};

uploadAndDownloadExample();
```

## Environment Variables

- `SERVICE_ACCOUNT_KEY_FILE`: Path to the Google Service Account credentials JSON file.
- `DEFAULT_DOWNLOAD_PATH`: Default path for downloaded files.

## License

MIT