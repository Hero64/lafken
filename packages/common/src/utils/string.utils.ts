export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const kebabCase = (str: string) => {
  if (str === str.toUpperCase()) {
    return str.toLocaleLowerCase();
  }

  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

export const cleanString = (str: string) => {
  return str.replace(/[^a-zA-Z0-9]/g, '');
};
