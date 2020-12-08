import getTypeFromField from "./getTypeFromField";

export default (fields) => {
    return Object.fromEntries(
        fields.map(x => [x.name, {
            type: getTypeFromField(x.type)
        }])
    );
}