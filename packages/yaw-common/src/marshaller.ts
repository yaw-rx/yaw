import { SingleRegexBindMarshaller } from './bind-marshaller/single-regex.js';
import { memoiseBindMarshaller } from './bind-marshaller/memoise-bind-marshaller.js';

export const marshaller = memoiseBindMarshaller(new SingleRegexBindMarshaller());
