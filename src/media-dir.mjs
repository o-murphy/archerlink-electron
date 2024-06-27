import { platform } from 'os';
import { execFile } from 'child_process';
import { join } from 'path';
import fs, { mkdir } from 'fs/promises';
import { DateTime } from 'luxon';


const OUTPUT_DIR_WINDOWS = join(process.env.LOCALAPPDATA, 'ArcherLink');
const OUTPUT_DIR_OTHERS = join(process.env.HOME, 'Pictures', 'ArcherLink');

const createOutputDir = async () => {
    let outputDir;

    if (platform() === 'win32') {
        outputDir = OUTPUT_DIR_WINDOWS;
    } else {
        outputDir = OUTPUT_DIR_OTHERS;
    }

    try {
        await mkdir(outputDir, { recursive: true });
        console.log(`Output directory created: ${outputDir}`);
        return outputDir
    } catch (err) {
        console.error('Error creating output directory:', err);
    }
};

const openOutputDir = async () => {

    let outputDir;

    if (platform() === 'win32') {
        outputDir = OUTPUT_DIR_WINDOWS;
    } else {
        outputDir = OUTPUT_DIR_OTHERS;
    }

    if (platform() === 'win32') {
        // Open directory using PowerShell on Windows
        execFile('powershell.exe', [
            '-Command',
            `$shell = New-Object -ComObject Shell.Application;
      $folder = $shell.NameSpace('${outputDir}');
      if ($folder -ne $null) {
        $folder.Self.InvokeVerb('open');
      }`,
        ]);
    } else if (platform() === 'darwin') {
        // Open directory using 'open' command on macOS
        execFile('open', [outputDir]);
    } else {
        // Assume Linux or other Unix-like platforms, use xdg-open
        execFile('xdg-open', [outputDir]);
    }
};


const getOutputFilename = async () => {
    let outputDir;

    if (platform() === 'win32') {
        outputDir = OUTPUT_DIR_WINDOWS;
    } else {
        outputDir = OUTPUT_DIR_OTHERS;
    }

    const dt = DateTime.now().toFormat('yyMMdd-HHmmss');
    return join(outputDir, `${dt}`);
};


// Function to save a frame to a file
async function saveFrameToFile(frame) {
    try {
        const outputFile = await getOutputFilename(); // Get the output filename
        const filePath = `${outputFile}.jpg`; // Example: save as JPG

        // Save frame data to file
        await fs.writeFile(filePath, frame);

        console.log(`Frame saved to: ${filePath}`);
        return filePath
    } catch (err) {
        console.error('Error saving frame to file:', err);
        throw err; // Re-throw the error to propagate it up
    }
}

export { createOutputDir, openOutputDir, getOutputFilename, saveFrameToFile };