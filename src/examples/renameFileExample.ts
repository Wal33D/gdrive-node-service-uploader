import { renameFileInGoogleDrive } from '../fileRename';

const fileId = '1y2E2o7Jf_uh4OI4KsPjL7HbqkJRiOtxO';
const fileUrl = 'https://drive.google.com/file/d/1HRmETDPMHlHtHpIZCMJP0JjB9AeX_PgU/view?usp=drivesdk';
const fileName = 'renamed_example_archive.zip';
const newName = 'renamed_again_example_archive.zip';

const renameFileExample = async () => {
   try {
      // Example using fileName
      const resultByName = await renameFileInGoogleDrive({ fileName, newName });
      console.log(resultByName);
   } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
   }
};

renameFileExample();
