// import applyFilters from './applyFilters';

export default (entityData) => (_, { filter = {} }) => {
    let items = entityData;
    // TODO: filters
    // let items = applyFilters(entityData, filter);

    return { count: items.length };
};