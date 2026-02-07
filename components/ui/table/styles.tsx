import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { isWeb } from '@gluestack-ui/utils/nativewind-utils';

const captionTableStyle = isWeb ? 'caption-bottom' : '';

export const tableStyle = tva({
  base: `table w-[800px] border-collapse`,
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
  base: 'flex-1 px-6 py-[14px] text-left font-roboto text-[16px] font-bold leading-[22px] text-typography-800',
});

export const tableRowStyleStyle = tva({
  base: 'border-0 border-b border-solid border-outline-200 bg-background-0',
  variants: {
    isHeaderRow: {
      true: '',
    },
    isFooterRow: {
      true: 'border-b-0',
    },
  },
});

export const tableDataStyle = tva({
  base: 'flex-1 px-6 py-[14px] text-left font-roboto text-[16px] font-medium leading-[22px] text-typography-800',
});

export const tableCaptionStyle = tva({
  base: `${captionTableStyle} bg-background-50 px-6 py-[14px] font-roboto text-[16px] font-normal leading-[22px] text-typography-800`,
});
