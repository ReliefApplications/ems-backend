function tagboxMeta (field) {
    return Object.assign(field, {
        choices: field.choices.map(x => {
            return {
                text: x.text ? x.text : x,
                value: x.value ? x.value : x
            };
        })
    });
}

export default tagboxMeta;
