import classnames from 'classnames';

export function cn(...inputs: classnames.ArgumentArray): string {
  return classnames(inputs);
}
