import { shareGoogleDriveDir } from '../shareGoogleDriveDir';

// Replace with your personal email address
const email = 'your-personal-email@gmail.com';

const shareGoogleDriveDirExample = async () => {
   try {
      await shareGoogleDriveDir(email);
      console.log('Root directory shared successfully.');
   } catch (error) {
      console.error('Error sharing root directory:', error);
   }
};

shareGoogleDriveDirExample();
