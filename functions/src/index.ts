import * as fs from 'fs';
import * as os from 'os';
import * as express from 'express';
import * as cors from 'cors';
import * as path from 'path';
import * as Busboy from 'busboy';
import * as functions from 'firebase-functions';
import vision from '@google-cloud/vision';

const credentials = require(path.join(__dirname, './service-account-key-file.json'));
const app = express();

const client = new vision.ImageAnnotatorClient({ credentials });

async function getTextFromFiles(file: Buffer | string) {
  const [result] = await client.textDetection(file);
  const detections = result.textAnnotations;
  const textList = [] as string[];
  console.log('Detection:', detections);
  console.log('Text:');
  if (!detections) return [];
  detections.forEach(text => {
    console.log(text.description);
    textList.push(text.description ?? '');
  });
  return textList;
}

const corsOptions = {
  origin: 'https://shared.astider.reviews',
};

app.use(cors(corsOptions));

app.post('/upload', async (req, res) => {
  if (req.method === 'POST') {
    const busboy = new Busboy({ headers: req.headers });
    const uploads = {} as Record<string, any>;
    let pathToFile = '';

    // This callback will be invoked for each file uploaded
    busboy.on('file', async (fieldname, file, filename, encoding, mimetype) => {
      console.log(`File [${fieldname}] filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`);
      
      const filepath = path.join(os.tmpdir(), fieldname);
      uploads[fieldname] = { file: filepath }
      console.log(`Saving '${fieldname}' to ${filepath}`);
      pathToFile = filepath;
      file.pipe(fs.createWriteStream(filepath));
    });

    // This callback will be invoked after all uploaded files are saved.
    busboy.on('finish', async () => {
      console.log('On finish');
      console.log(uploads);
      const texts = await getTextFromFiles(pathToFile);
      for (const name in uploads) {
        const upload = uploads[name];
        const file = upload.file;
        fs.unlinkSync(file);
        console.log(`remove [${file}] from disk`);
      }
      res.json({
        list: texts,
      });
    });

    busboy.end((req as any).rawBody);
  } else {
    res.status(404).end();
  }
});

exports.vision = functions.https.onRequest(app);
