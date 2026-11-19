import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: string[], filled = false) {
  return function Icon({ size = 20, ...rest }: Props) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 1.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...rest}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  };
}

const STAR = 'M12 2.8l2.85 5.8 6.4.93-4.63 4.5 1.1 6.37L12 17.4l-5.72 3 1.1-6.37-4.63-4.5 6.4-.93L12 2.8z';

export const IconList = make(['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3.5 6h.01', 'M3.5 12h.01', 'M3.5 18h.01']);
export const IconBolt = make(['M13 2 3 14h9l-1 8 10-12h-9l1-8z']);
export const IconPlus = make(['M12 5v14', 'M5 12h14']);
export const IconSliders = make(['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6']);
export const IconExternal = make(['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6']);
export const IconStar = make([STAR]);
export const IconStarFilled = make([STAR], true);
export const IconSearch = make(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35']);
export const IconFilter = make(['M22 3H2l8 9.46V19l4 2v-8.54L22 3z']);
export const IconX = make(['M18 6 6 18', 'M6 6l12 12']);
export const IconLeft = make(['M15 18l-6-6 6-6']);
export const IconRight = make(['M9 18l6-6-6-6']);
export const IconEdit = make(['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z']);
export const IconEyeOff = make([
  'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94',
  'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19',
  'M14.12 14.12a3 3 0 1 1-4.24-4.24',
  'M1 1l22 22',
]);
export const IconEye = make(['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z']);
export const IconTrash = make(['M3 6h18', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', 'M10 11v6', 'M14 11v6', 'M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2']);
export const IconUp = make(['M18 15l-6-6-6 6']);
export const IconDown = make(['M6 9l6 6 6-6']);
export const IconDownload = make(['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']);
export const IconUpload = make(['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']);
export const IconClipboard = make(['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 2h6v4H9z']);
export const IconPlay = make(['M7 4.5v15l12.5-7.5L7 4.5z'], true);
export const IconLayers = make(['M12 2 2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5']);
export const IconShare = make(['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13']);
export const IconCheck = make(['M20 6 9 17l-5-5']);
export const IconPencilLine = make(['M3 21h18', 'M14.5 4.5l3 3L8 17H5v-3l9.5-9.5z']);
