const { platform } = require('os');
const { execFile } = require('child_process');
const { join } = require('path');
const fs = require('fs/promises');
const { DateTime } = require('luxon');

const outputDirWindows = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'ArcherLink') : undefined;
const outputDirOthers = process.env.HOME ? join(process.env.HOME, 'Pictures', 'ArcherLink') : undefined;

const outputDir = process.platform === 'win32' ? outputDirWindows : outputDirOthers;


const createOutputDir = async () => {
    if (!outputDir) {
        console.error('Output directory is not defined');
        return; // Exit function early if outputDir is undefined
    }

    try {
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`Output directory created: ${outputDir}`);
        return outputDir;
    } catch (err) {
        console.error('Error creating output directory:', err);
        throw err; // Re-throw the error to be caught by the caller
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

module.exports = {
    outputDir, createOutputDir, openOutputDir, getOutputFilename, saveFrameToFile
};