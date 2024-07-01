import { platform } from 'os';
import { execFile } from 'child_process';
import { join } from 'path';
import fs, { mkdir } from 'fs/promises';
import { DateTime } from 'luxon';

const outputDirWindows = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'ArcherLink') : undefined;
const outputDirOthers = process.env.HOME ? join(process.env.HOME, 'Pictures', 'ArcherLink') : undefined;

export const outputDir = process.platform === 'win32' ? outputDirWindows : outputDirOthers;


const createOutputDir = async () => {
    try {
        await mkdir(outputDir, { recursive: true });
        console.log(`Output directory created: ${outputDir}`);
        return outputDir
    } catch (err) {
        console.error('Error creating output directory:', err);
    }
};

const openOutputDir = async () => {
    if (platform() === 'win32') {
        execFile('powershell.exe', [
            '-Command',
            `$shell = New-Object -ComObject Shell.Application;
      $folder = $shell.NameSpace('${outputDir}');
      if ($folder -ne $null) {
        $folder.Self.InvokeVerb('open');
      }`,
        ]);
    } else if (platform() === 'darwin') {
        execFile('open', [outputDir]);
    } else {
        execFile('xdg-open', [outputDir]);
    }
};


const getOutputFilename = async () => {
    const dt = DateTime.now().toFormat('yyMMdd-HHmmss');
    return join(outputDir, `${dt}`);
};


async function saveFrameToFile(frame) {
    try {
        const outputFile = await getOutputFilename(); // Get the output filename
        const filePath = `${outputFile}.jpg`; // Example: save as JPG

        await fs.writeFile(filePath, frame);

        console.log(`Frame saved to: ${filePath}`);
        return filePath
    } catch (err) {
        console.error('Error saving frame to file:', err);
        throw err;
    }
}

export { createOutputDir, openOutputDir, getOutputFilename, saveFrameToFile };