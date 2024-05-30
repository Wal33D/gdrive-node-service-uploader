import { deleteFileFromGoogleDrive } from '../fileDelete';

const fileId = '1HRmETDPMHlHtHpIZCMJP0JjB9AeX_PgU';
const fileUrl = 'https://drive.google.com/file/d/1HRmETDPMHlHtHpIZCMJP0JjB9AeX_PgU/view?usp=drivesdk';
const fileName = 'example_archive.zip';

const deleteFileExample = async () => {
   try {
      // Example using fileName
      const resultByName = await deleteFileFromGoogleDrive({ fileName });
      console.log(resultByName.message);
   } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
   }
};

deleteFileExample();
