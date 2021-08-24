/*  Check if the structure is correct and add a new field at the beginning. Use a passed structure to fetch the correct question.
    Function by induction.
*/
export default function addField(structure: any, name: string, template: any): void {
    if (structure.pages && structure.pages.length > 0 && structure.pages[0].elements) {
        structure.pages[0].elements.unshift(getQuestion(template, name));
    }
}

/*  Based on the passed field, find the corresponfing question in a structure and return it.
    Function by induction.
*/
function getQuestion(structure: any, name: string): any {
    // Loop on elements to find the right question
    if (structure.pages) {
        for (const page of structure.pages) {
            const question = getQuestion(page, name);
            if (question) return question;
        }
    } else if (structure.elements) {
        for (const elementIndex in structure.elements) {
            const element = structure.elements[elementIndex];
            if (element.type === 'panel') {
                const question = getQuestion(element, name);
                if (question) return question;
            } else {
                if (element.valueName === name) {
                    // Return question
                    return element;
                }
            }
        }
    }
}

/*  Check if the structure is correct and replace the passed field with the corresponding one from the passed structure.
    Function by induction.
*/
export function replaceField(structure: any, name: string, template: any): true {
    // Loop on elements to find the right question
    if (structure.pages) {
        for (const page of structure.pages) {
            if (replaceField(page, name, template)) return true;
        }
    } else if (structure.elements) {
        for (const elementIndex in structure.elements) {
            const element = structure.elements[elementIndex];
            if (element.type === 'panel') {
                if (replaceField(element, name, template)) return true;
            } else {
                if (element.valueName === name) {
                    // Replace the field
                    structure.elements[elementIndex] = getQuestion(template, name);
                    return true;
                }
            }
        }
    }
}