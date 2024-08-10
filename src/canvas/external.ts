export function loadJsCssFile(filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const fileref = document.createElement('script');
        fileref.type = 'text/javascript';
        fileref.src = filename;

        fileref.onload = () => resolve();
        fileref.onerror = () => reject(new Error(`Failed to load ${filename}`));

        fileref.onload = () => resolve();

        // Append to head or document element
        const parent = document.getElementsByTagName('head')[0] || document.documentElement;
        parent.appendChild(fileref);
    });
}