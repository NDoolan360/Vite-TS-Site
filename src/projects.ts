import domPurify from "dompurify";
import LogoLink from "./logo-link-web-component";

type Site = "cults3d" | "github" | "boardgamegeek";
type Language = { name: string; style: string };
type Image = {
    highResSrc: string | null;
    lowResSrc: string | null;
    alt: string | null;
};

type Project = {
    host?: Site;
    title?: string;
    description?: string;
    url?: URL;
    image?: Image;
    programmingLanguage?: Language;
};

// Fetch data from sites profile
export const fetchData = async (
    site: string,
    parserType: DOMParserSupportedType = "text/html",
): Promise<Document> => {
    const response = await fetch(site);
    const data = await response.text();

    const parser = new DOMParser();
    return parser.parseFromString(data, parserType);
};

export const scrapeGithub = (doc: Document): Project[] => {
    const githubProjects: Project[] = [];

    const projectElements = doc.querySelectorAll(
        'div[class*="Box pinned-item-list-item"]:not(div[class*="fork"])',
    );

    for (const projectElement of projectElements) {
        const titleElement = projectElement.querySelector(
            'span[class*="repo"]',
        );
        const descriptionElement = projectElement.querySelector(
            'p[class*="pinned-item-desc"]',
        );
        const urlElement = projectElement.querySelector('a[class*="Link"]');
        const langaugeNameElement = projectElement.querySelector(
            'span[itemprop*="programmingLanguage"]',
        );
        const langaugeColourElement = projectElement.querySelector(
            'span[class*="repo-language-color"]',
        );

        let title;
        let description;
        let url;
        let programmingLanguage;

        if (titleElement) {
            title = titleElement.innerHTML.trim();
        }
        if (descriptionElement) {
            description = descriptionElement.innerHTML.trim();
        }
        const href = urlElement?.getAttribute("href");
        if (href) {
            url = new URL(href, "https://github.com");
        }
        const languageStyle = langaugeColourElement?.getAttribute("style");
        if (langaugeNameElement?.innerHTML && languageStyle) {
            programmingLanguage = {
                name: langaugeNameElement.innerHTML,
                style: languageStyle,
            };
        }

        githubProjects.push({
            host: "github",
            title,
            description,
            image: {
                highResSrc: "/images/github.png",
                lowResSrc: null,
                alt: "Github Logo",
            },
            url,
            programmingLanguage,
        });
    }

    return githubProjects;
};

export const scrapeCults3d = (doc: Document): Project[] => {
    const cults3dProjects: Project[] = [];

    const projectElements = doc.querySelectorAll('article[class*="crea"]');

    for (const projectElement of projectElements) {
        const titleElement = projectElement.querySelector(
            'a[class*="drawer-contents"]',
        );
        const urlElement = projectElement.querySelector(
            'a[class*="drawer-contents"]',
        );
        const imageElement = projectElement.querySelector(
            'img[class*="painting-image"]',
        );

        let title;
        let url;
        let image;

        const titleValue = titleElement?.getAttribute("title");
        if (titleValue) {
            title = titleValue.trim();
        }
        const href = urlElement?.getAttribute("href");
        if (href) {
            url = new URL(href, "https://cults3d.com");
        }
        const dataSrc = imageElement?.getAttribute("data-src");
        if (dataSrc) {
            let source = dataSrc;
            let sourceBackup = null;

            // extract full size file rather than thumbnail image if possible
            const regex = /https:\/\/files\.cults3d\.com[^'"]+/;
            const match = source?.match(regex);

            if (match?.[0]) {
                sourceBackup = source;
                source = match[0];
            }

            image = {
                highResSrc: source,
                lowResSrc: sourceBackup,
                alt: imageElement?.getAttribute("alt"),
            } as Image;
        }

        cults3dProjects.push({ host: "cults3d", title, url, image });
    }

    return cults3dProjects;
};

export const scrapeBgg = (doc: Document): Project[] => {
    const bggProjects: Project[] = [];
    const projectElements = doc.querySelectorAll('tr[id*="row_"]');

    for (const projectElement of projectElements) {
        const titleElement = projectElement.querySelector(
            'td[class*="collection_objectname"] > div > a',
        );
        const descriptionElement = projectElement.querySelector(
            'td[class*="collection_objectname"] > p',
        );
        const imageElement = projectElement.querySelector(
            'td[class*="collection_thumbnail"] > a > img',
        );
        const urlElement = projectElement.querySelector(
            'td[class*="collection_thumbnail"] > a',
        );

        let title;
        let description;
        let url;
        let image;

        if (titleElement) {
            title = titleElement.innerHTML.trim();
        }
        if (descriptionElement) {
            description = descriptionElement.innerHTML.trim();
        }
        const href = urlElement?.getAttribute("href");
        if (href) {
            url = new URL(href, "https://boardgamegeek.com");
        }
        if (imageElement?.getAttribute("src")) {
            image = {
                highResSrc: imageElement.getAttribute("src"),
                lowResSrc: null,
                alt: imageElement.getAttribute("alt"),
            } as Image;
        }

        bggProjects.push({
            host: "boardgamegeek",
            title,
            description,
            url,
            image,
        });
    }

    return bggProjects;
};

export const upgradeBggImage = (project: Project, xmlDoc: XMLDocument) => {
    const imageXmlElement = xmlDoc.getElementsByTagName("image").item(0);
    if (imageXmlElement && project.image) {
        project.image.lowResSrc = project.image.highResSrc;
        project.image.highResSrc = imageXmlElement.innerHTML;
    }
};

export const projectIntoTemplate = (
    project: Project,
    template: HTMLTemplateElement,
): DocumentFragment => {
    const templateClone = document.importNode(template.content, true);

    const setElementContent = <T extends Element, U>(
        selector: string,
        content: U | undefined,
        setter: (element: T, content: U) => void,
    ) => {
        const element = templateClone.querySelector<T>(selector);
        if (element) {
            if (content) {
                setter(element, content);
            } else {
                element.remove();
            }
        }
    };

    // Set project title
    setElementContent(
        '[class="card-heading"]',
        project.title,
        (element, content) => {
            element.textContent = domPurify.sanitize(content);
        },
    );

    // Set project description
    setElementContent(
        '[class="card-description"]',
        project.description,
        (element, content) => {
            element.textContent = domPurify.sanitize(content);
        },
    );

    // Set project URL
    setElementContent<HTMLLinkElement, string>(
        '[class="card-link"]',
        project.url?.href,
        (element, content) => {
            element.href = domPurify.sanitize(content);
        },
    );

    // Set project language
    setElementContent<Element, Language>(
        '[class="card-language"]',
        project.programmingLanguage,
        (element, content) => {
            element.textContent = domPurify.sanitize(content.name);
        },
    );

    // Set project language colour
    setElementContent<Element, Language>(
        '[class="card-language-colour"]',
        project.programmingLanguage,
        (element, content) => {
            element.setAttribute("style", domPurify.sanitize(content.style));
        },
    );

    // Set logo text
    setElementContent<LogoLink, string>(
        '[class*="card-logo"]',
        project.host,
        (element, content) => {
            element.innerHTML = domPurify.sanitize(content);
        },
    );
    // Set logo link
    setElementContent<LogoLink, string>(
        '[class*="card-logo"]',
        project.url?.href,
        (element, content) => {
            element.setAttribute("href", domPurify.sanitize(content));
        },
    );

    // Set project feature image
    setElementContent<HTMLImageElement, Image>(
        '[class="card-feature-image"]',
        project.image,
        (element, content) => {
            element.alt = content.alt ?? "Feature image";

            // Chain loading of progressively higher res images (default -> srcBackup -> src)
            element.src = "/images/default.png";
            const lowRes = content.lowResSrc;
            const highRes = content.highResSrc;
            if (lowRes) {
                element.onload = () => {
                    element.src = domPurify.sanitize(lowRes);
                    if (highRes) {
                        element.onload = () => {
                            element.src = domPurify.sanitize(highRes);
                        };
                    }
                };
            } else if (highRes) {
                element.onload = () => {
                    element.src = domPurify.sanitize(highRes);
                };
            }
        },
    );

    return templateClone;
};

export const appendRandom = async (
    parent: HTMLElement,
    ...elements: DocumentFragment[]
) => {
    for (const element of elements) {
        const children = parent.children;
        const randomIndex = Math.floor(Math.random() * (children.length + 1));

        if (randomIndex === children.length) {
            // If the random index is equal to the length, append at the end
            parent.append(element);
        } else {
            // Otherwise, insert at the randomly determined index
            parent.insertBefore(element, children[randomIndex]);
        }
    }
};

const loadProjects = async () => {
    // Create project-gallery loader
    const loader = document.createElement("span");
    loader.classList.add("loader");
    document.getElementById("projects")?.append(loader);

    // Load items into gallery
    const gallery = document.getElementById("project-gallery");
    const template = document.getElementById("project-template") as
        | HTMLTemplateElement
        | undefined;

    if (gallery && template) {
        const githubPage = await fetchData("/proxy/github");
        const githubProjects = scrapeGithub(githubPage).map((p) =>
            projectIntoTemplate(p, template),
        );
        await appendRandom(gallery, ...githubProjects);

        const bggPage = await fetchData("/proxy/boardgamegeek");
        const bggRawProjects = scrapeBgg(bggPage);

        // Get higher resolution image from bgg xmlapi
        for (const project of bggRawProjects) {
            const id = project.url
                ?.toString()
                ?.split("/")
                .find((v) => v.match(/\d+/g));
            const gameXml = await fetchData(
                `/xmlapi/boardgamegeek/${id}`,
                "text/xml",
            );
            upgradeBggImage(project, gameXml);
        }

        const bggProjects = bggRawProjects.map((p) =>
            projectIntoTemplate(p, template),
        );

        await appendRandom(gallery, ...bggProjects);

        const cults3dPage = await fetchData("/proxy/cults3d");
        const cults3dProjects = scrapeCults3d(cults3dPage).map((p) =>
            projectIntoTemplate(p, template),
        );
        await appendRandom(gallery, ...cults3dProjects);
    }

    // remove loader
    loader.remove();
};

loadProjects();
