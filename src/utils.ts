export const replaceWithCurrentYear = (input: string, match: string): string => {
    return input.replace(match, new Date().getFullYear().toString());
};

// Fetch data from sites profile
export const fetchData = async (
    source: string,
    parserType: DOMParserSupportedType = "text/html",
): Promise<Document> => {
    let data;

    if (source.startsWith("http://") || source.startsWith("https://")) {
        const response = await fetch(source);
        data = await response.text();
    } else {
        // Read source as data if not a url (used for testing)
        data = source;
    }

    const parser = new DOMParser();
    return parser.parseFromString(data, parserType);
};