import { Record } from "../../../models"

export default () => (_, { id}) => {
    console.log(id);
    return Record.findById(id);
}