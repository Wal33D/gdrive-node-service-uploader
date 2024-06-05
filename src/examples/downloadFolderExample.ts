import path from 'path';
import { folderDownload } from '../folderDownload';

const folderId = '13w5t4cGd9Qfzm9pBdtppAgDAQxQcKqSG';
const folderName = '1193300291862';
const destinationPath = 'C:\\Users\\Aquataze\\Desktop\\discordChannelBot\\catalog\\community';

const downloadFolderExample = async () => {
   const result = await folderDownload({ folderName, destinationPath: path.resolve(destinationPath) });
   console.log('Download result:', result);
};

downloadFolderExample();
