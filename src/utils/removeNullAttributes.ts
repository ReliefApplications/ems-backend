// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (x: any) => Object.fromEntries(Object.entries(x).filter(([_, v]) => v != null));
