import JSZip from "jszip";

export async function downloadWord(url: string) {
    return fetch(url)
        .then(function (response) {                       // 2) filter on 200 OK
            if (response.status === 200 || response.status === 0) {
                return Promise.resolve(response.blob());
            } else {
                return Promise.reject(new Error(response.statusText));
            }
        })
        .then(JSZip.loadAsync);
}

export function parseWordDocument(contents: string) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(contents, "text/xml");
}