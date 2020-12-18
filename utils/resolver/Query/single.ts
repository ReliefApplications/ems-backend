import { Record } from "../../../models"

export default () => (_, { id}) => {
    return Record.findById(id);
}