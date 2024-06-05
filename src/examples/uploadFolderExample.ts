import { folderUpload } from '../folderUpload';

const folderPath = 'C:\\Users\\Aquataze\\Desktop\\discordChannelBot\\catalog\\community\\1193300291862';
const description = 'Test upload of community catalog folder';

const uploadFolderExample = async () => {
   const result = await folderUpload({ folderPath, description });
   console.log('Upload result:', result);
};

uploadFolderExample();
