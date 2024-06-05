import { deleteAllFilesFromDrive } from '../deleteAllFilesFromDrive';

const deleteGoogleDriveDirExample = async () => {
   try {
      await deleteAllFilesFromDrive();
      console.log('Root directory deleted successfully.');
   } catch (error) {
      console.error('Error sharing root directory:', error);
   }
};

deleteGoogleDriveDirExample();
