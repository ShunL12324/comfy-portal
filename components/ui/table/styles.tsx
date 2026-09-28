import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { isWeb } from '@gluestack-ui/utils/nativewind-utils';

const captionTableStyle = isWeb ? 'caption-bottom' : '';

export const tableStyle = tva({
  base: `table border-collapse border-collapse w-[800px]`,
});

export const tableHeaderStyle = tva({
  base: '',
});

export const tableBodyStyle = tva({
  base: '',
});

export const tableFooterStyle = tva({
  base: '',
});

export const tableHeadStyle = tva({
  base: 'flex-1 px-6 py-4 text-left font-bold text-base text-typography-800 font-body',
});

export const tableRowStyleStyle = tva({
  base: 'border-0 border-b border-solid border-outline-200 bg-background-0',
  variants: {
    isHeaderRow: {
      true: '',
    },
    isFooterRow: {
      true: 'border-b-0 ',
    },
  },
});

export const tableDataStyle = tva({
  base: 'flex-1 px-6 py-4 text-left text-base font-medium text-typography-800 font-body',
});

export const tableCaptionStyle = tva({
  base: `${captionTableStyle} px-6 py-4 text-base font-normal text-typography-800 bg-background-50 font-body`,
});
