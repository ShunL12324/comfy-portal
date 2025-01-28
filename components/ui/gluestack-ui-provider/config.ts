'use client';
import { vars } from 'nativewind';

export const config = {
  light: vars({
    '--color-primary-0': '179 179 179',
    '--color-primary-50': '153 153 153',
    '--color-primary-100': '128 128 128',
    '--color-primary-200': '115 115 115',
    '--color-primary-300': '102 102 102',
    '--color-primary-400': '82 82 82',
    '--color-primary-500': '51 51 51',
    '--color-primary-600': '41 41 41',
    '--color-primary-700': '31 31 31',
    '--color-primary-800': '13 13 13',
    '--color-primary-900': '10 10 10',
    '--color-primary-950': '8 8 8',

    /* Secondary  */
    '--color-secondary-0': '253 253 253',
    '--color-secondary-50': '251 251 251',
    '--color-secondary-100': '246 246 246',
    '--color-secondary-200': '242 242 242',
    '--color-secondary-300': '237 237 237',
    '--color-secondary-400': '230 230 231',
    '--color-secondary-500': '217 217 219',
    '--color-secondary-600': '198 199 199',
    '--color-secondary-700': '189 189 189',
    '--color-secondary-800': '177 177 177',
    '--color-secondary-900': '165 164 164',
    '--color-secondary-950': '157 157 157',

    /* Tertiary */
    '--color-tertiary-0': '255 250 245',
    '--color-tertiary-50': '255 242 229',
    '--color-tertiary-100': '255 233 213',
    '--color-tertiary-200': '254 209 170',
    '--color-tertiary-300': '253 180 116',
    '--color-tertiary-400': '251 157 75',
    '--color-tertiary-500': '231 129 40',
    '--color-tertiary-600': '215 117 31',
    '--color-tertiary-700': '180 98 26',
    '--color-tertiary-800': '130 73 23',
    '--color-tertiary-900': '108 61 19',
    '--color-tertiary-950': '84 49 18',

    /* Error */
    '--color-error-0': '254 233 233',
    '--color-error-50': '254 226 226',
    '--color-error-100': '254 202 202',
    '--color-error-200': '252 165 165',
    '--color-error-300': '248 113 113',
    '--color-error-400': '239 68 68',
    '--color-error-500': '230 53 53',
    '--color-error-600': '220 38 38',
    '--color-error-700': '185 28 28',
    '--color-error-800': '153 27 27',
    '--color-error-900': '127 29 29',
    '--color-error-950': '83 19 19',

    /* Success */
    '--color-success-0': '228 255 244',
    '--color-success-50': '202 255 232',
    '--color-success-100': '162 241 192',
    '--color-success-200': '132 211 162',
    '--color-success-300': '102 181 132',
    '--color-success-400': '72 151 102',
    '--color-success-500': '52 131 82',
    '--color-success-600': '42 121 72',
    '--color-success-700': '32 111 62',
    '--color-success-800': '22 101 52',
    '--color-success-900': '20 83 45',
    '--color-success-950': '27 50 36',

    /* Warning */
    '--color-warning-0': '255 249 245',
    '--color-warning-50': '255 244 236',
    '--color-warning-100': '255 231 213',
    '--color-warning-200': '254 205 170',
    '--color-warning-300': '253 173 116',
    '--color-warning-400': '251 149 75',
    '--color-warning-500': '231 120 40',
    '--color-warning-600': '215 108 31',
    '--color-warning-700': '180 90 26',
    '--color-warning-800': '130 68 23',
    '--color-warning-900': '108 56 19',
    '--color-warning-950': '84 45 18',

    /* Info */
    '--color-info-0': '236 248 254',
    '--color-info-50': '199 235 252',
    '--color-info-100': '162 221 250',
    '--color-info-200': '124 207 248',
    '--color-info-300': '87 194 246',
    '--color-info-400': '50 180 244',
    '--color-info-500': '13 166 242',
    '--color-info-600': '11 141 205',
    '--color-info-700': '9 115 168',
    '--color-info-800': '7 90 131',
    '--color-info-900': '5 64 93',
    '--color-info-950': '3 38 56',

    /* Typography */
    '--color-typography-0': '254 254 255',
    '--color-typography-50': '245 245 245',
    '--color-typography-100': '229 229 229',
    '--color-typography-200': '219 219 220',
    '--color-typography-300': '212 212 212',
    '--color-typography-400': '163 163 163',
    '--color-typography-500': '140 140 140',
    '--color-typography-600': '115 115 115',
    '--color-typography-700': '82 82 82',
    '--color-typography-800': '64 64 64',
    '--color-typography-900': '38 38 39',
    '--color-typography-950': '23 23 23',

    /* Outline */
    '--color-outline-0': '253 254 254',
    '--color-outline-50': '243 243 243',
    '--color-outline-100': '230 230 230',
    '--color-outline-200': '221 220 219',
    '--color-outline-300': '211 211 211',
    '--color-outline-400': '165 163 163',
    '--color-outline-500': '140 141 141',
    '--color-outline-600': '115 116 116',
    '--color-outline-700': '83 82 82',
    '--color-outline-800': '65 65 65',
    '--color-outline-900': '39 38 36',
    '--color-outline-950': '26 23 23',

    /* Background */
    '--color-background-0': '255 255 255',
    '--color-background-50': '246 246 246',
    '--color-background-100': '242 241 241',
    '--color-background-200': '220 219 219',
    '--color-background-300': '213 212 212',
    '--color-background-400': '162 163 163',
    '--color-background-500': '142 142 142',
    '--color-background-600': '116 116 116',
    '--color-background-700': '83 82 82',
    '--color-background-800': '65 64 64',
    '--color-background-900': '39 38 37',
    '--color-background-950': '18 18 18',

    /* Background Special */
    '--color-background-error': '254 241 241',
    '--color-background-warning': '255 243 234',
    '--color-background-success': '237 252 242',
    '--color-background-muted': '247 248 247',
    '--color-background-info': '235 248 254',

    /* Focus Ring Indicator  */
    '--color-indicator-primary': '55 55 55',
    '--color-indicator-info': '83 153 236',
    '--color-indicator-error': '185 28 28',

    /* Accent Colors */
    '--color-accent-0': '239 246 255', // rgb(239, 246, 255) - Lightest accent
    '--color-accent-50': '219 234 254', // rgb(219, 234, 254)
    '--color-accent-100': '191 219 254', // rgb(191, 219, 254)
    '--color-accent-200': '147 197 253', // rgb(147, 197, 253)
    '--color-accent-300': '96 165 250', // rgb(96, 165, 250)
    '--color-accent-400': '59 130 246', // rgb(59, 130, 246)
    '--color-accent-500': '37 99 235', // rgb(37, 99, 235) - Primary accent
    '--color-accent-600': '29 78 216', // rgb(29, 78, 216)
    '--color-accent-700': '30 64 175', // rgb(30, 64, 175)
    '--color-accent-800': '30 58 138', // rgb(30, 58, 138)
    '--color-accent-900': '30 48 110', // rgb(30, 48, 110)
    '--color-accent-950': '23 37 84', // rgb(23, 37, 84) - Darkest accent
  }),
  dark: vars({
    '--color-primary-0': '166 166 166', // rgb(166, 166, 166)
    '--color-primary-50': '175 175 175', // rgb(175, 175, 175)
    '--color-primary-100': '186 186 186', // rgb(186, 186, 186)
    '--color-primary-200': '197 197 197', // rgb(197, 197, 197)
    '--color-primary-300': '212 212 212', // rgb(212, 212, 212)
    '--color-primary-400': '221 221 221', // rgb(221, 221, 221)
    '--color-primary-500': '230 230 230', // rgb(230, 230, 230)
    '--color-primary-600': '240 240 240', // rgb(240, 240, 240)
    '--color-primary-700': '250 250 250', // rgb(250, 250, 250)
    '--color-primary-800': '253 253 253', // rgb(253, 253, 253)
    '--color-primary-900': '254 249 249', // rgb(254, 249, 249)
    '--color-primary-950': '253 252 252', // rgb(253, 252, 252)

    /* Secondary  */
    '--color-secondary-0': '20 20 20', // rgb(20, 20, 20)
    '--color-secondary-50': '23 23 23', // rgb(23, 23, 23)
    '--color-secondary-100': '31 31 31', // rgb(31, 31, 31)
    '--color-secondary-200': '39 39 39', // rgb(39, 39, 39)
    '--color-secondary-300': '44 44 44', // rgb(44, 44, 44)
    '--color-secondary-400': '56 57 57', // rgb(56, 57, 57)
    '--color-secondary-500': '63 64 64', // rgb(63, 64, 64)
    '--color-secondary-600': '86 86 86', // rgb(86, 86, 86)
    '--color-secondary-700': '110 110 110', // rgb(110, 110, 110)
    '--color-secondary-800': '135 135 135', // rgb(135, 135, 135)
    '--color-secondary-900': '150 150 150', // rgb(150, 150, 150)
    '--color-secondary-950': '164 164 164', // rgb(164, 164, 164)

    /* Tertiary */
    '--color-tertiary-0': '84 49 18', // rgb(84, 49, 18)
    '--color-tertiary-50': '108 61 19', // rgb(108, 61, 19)
    '--color-tertiary-100': '130 73 23', // rgb(130, 73, 23)
    '--color-tertiary-200': '180 98 26', // rgb(180, 98, 26)
    '--color-tertiary-300': '215 117 31', // rgb(215, 117, 31)
    '--color-tertiary-400': '231 129 40', // rgb(231, 129, 40)
    '--color-tertiary-500': '251 157 75', // rgb(251, 157, 75)
    '--color-tertiary-600': '253 180 116', // rgb(253, 180, 116)
    '--color-tertiary-700': '254 209 170', // rgb(254, 209, 170)
    '--color-tertiary-800': '255 233 213', // rgb(255, 233, 213)
    '--color-tertiary-900': '255 242 229', // rgb(255, 242, 229)
    '--color-tertiary-950': '255 250 245', // rgb(255, 250, 245)

    /* Error */
    '--color-error-0': '83 19 19', // rgb(83, 19, 19)
    '--color-error-50': '127 29 29', // rgb(127, 29, 29)
    '--color-error-100': '153 27 27', // rgb(153, 27, 27)
    '--color-error-200': '185 28 28', // rgb(185, 28, 28)
    '--color-error-300': '220 38 38', // rgb(220, 38, 38)
    '--color-error-400': '230 53 53', // rgb(230, 53, 53)
    '--color-error-500': '239 68 68', // rgb(239, 68, 68)
    '--color-error-600': '249 97 96', // rgb(249, 97, 96)
    '--color-error-700': '229 91 90', // rgb(229, 91, 90)
    '--color-error-800': '254 202 202', // rgb(254, 202, 202)
    '--color-error-900': '254 226 226', // rgb(254, 226, 226)
    '--color-error-950': '254 233 233', // rgb(254, 233, 233)

    /* Success */
    '--color-success-0': '27 50 36', // rgb(27, 50, 36)
    '--color-success-50': '20 83 45', // rgb(20, 83, 45)
    '--color-success-100': '22 101 52', // rgb(22, 101, 52)
    '--color-success-200': '32 111 62', // rgb(32, 111, 62)
    '--color-success-300': '42 121 72', // rgb(42, 121, 72)
    '--color-success-400': '52 131 82', // rgb(52, 131, 82)
    '--color-success-500': '72 151 102', // rgb(72, 151, 102)
    '--color-success-600': '102 181 132', // rgb(102, 181, 132)
    '--color-success-700': '132 211 162', // rgb(132, 211, 162)
    '--color-success-800': '162 241 192', // rgb(162, 241, 192)
    '--color-success-900': '202 255 232', // rgb(202, 255, 232)
    '--color-success-950': '228 255 244', // rgb(228, 255, 244)

    /* Warning */
    '--color-warning-0': '84 45 18', // rgb(84, 45, 18)
    '--color-warning-50': '108 56 19', // rgb(108, 56, 19)
    '--color-warning-100': '130 68 23', // rgb(130, 68, 23)
    '--color-warning-200': '180 90 26', // rgb(180, 90, 26)
    '--color-warning-300': '215 108 31', // rgb(215, 108, 31)
    '--color-warning-400': '231 120 40', // rgb(231, 120, 40)
    '--color-warning-500': '251 149 75', // rgb(251, 149, 75)
    '--color-warning-600': '253 173 116', // rgb(253, 173, 116)
    '--color-warning-700': '254 205 170', // rgb(254, 205, 170)
    '--color-warning-800': '255 231 213', // rgb(255, 231, 213)
    '--color-warning-900': '255 244 237', // rgb(255, 244, 237)
    '--color-warning-950': '255 249 245', // rgb(255, 249, 245)

    /* Info */
    '--color-info-0': '3 38 56', // rgb(3, 38, 56)
    '--color-info-50': '5 64 93', // rgb(5, 64, 93)
    '--color-info-100': '7 90 131', // rgb(7, 90, 131)
    '--color-info-200': '9 115 168', // rgb(9, 115, 168)
    '--color-info-300': '11 141 205', // rgb(11, 141, 205)
    '--color-info-400': '13 166 242', // rgb(13, 166, 242)
    '--color-info-500': '50 180 244', // rgb(50, 180, 244)
    '--color-info-600': '87 194 246', // rgb(87, 194, 246)
    '--color-info-700': '124 207 248', // rgb(124, 207, 248)
    '--color-info-800': '162 221 250', // rgb(162, 221, 250)
    '--color-info-900': '199 235 252', // rgb(199, 235, 252)
    '--color-info-950': '236 248 254', // rgb(236, 248, 254)

    /* Typography */
    '--color-typography-0': '23 23 23', // rgb(23, 23, 23)
    '--color-typography-50': '38 38 39', // rgb(38, 38, 39)
    '--color-typography-100': '64 64 64', // rgb(64, 64, 64)
    '--color-typography-200': '82 82 82', // rgb(82, 82, 82)
    '--color-typography-300': '115 115 115', // rgb(115, 115, 115)
    '--color-typography-400': '140 140 140', // rgb(140, 140, 140)
    '--color-typography-500': '163 163 163', // rgb(163, 163, 163)
    '--color-typography-600': '212 212 212', // rgb(212, 212, 212)
    '--color-typography-700': '219 219 220', // rgb(219, 219, 220)
    '--color-typography-800': '229 229 229', // rgb(229, 229, 229)
    '--color-typography-900': '245 245 245', // rgb(245, 245, 245)
    '--color-typography-950': '254 254 255', // rgb(254, 254, 255)

    /* Outline */
    '--color-outline-0': '26 23 23', // rgb(26, 23, 23)
    '--color-outline-50': '39 38 36', // rgb(39, 38, 36)
    '--color-outline-100': '65 65 65', // rgb(65, 65, 65)
    '--color-outline-200': '83 82 82', // rgb(83, 82, 82)
    '--color-outline-300': '115 116 116', // rgb(115, 116, 116)
    '--color-outline-400': '140 141 141', // rgb(140, 141, 141)
    '--color-outline-500': '165 163 163', // rgb(165, 163, 163)
    '--color-outline-600': '211 211 211', // rgb(211, 211, 211)
    '--color-outline-700': '221 220 219', // rgb(221, 220, 219)
    '--color-outline-800': '230 230 230', // rgb(230, 230, 230)
    '--color-outline-900': '243 243 243', // rgb(243, 243, 243)
    '--color-outline-950': '253 254 254', // rgb(253, 254, 254)

    /* Background */
    '--color-background-0': '13 13 13', // rgb(13, 13, 13) - Deepest background
    '--color-background-50': '18 18 18', // rgb(18, 18, 18) - App background
    '--color-background-100': '24 24 24', // rgb(24, 24, 24) - Subtle element background
    '--color-background-200': '32 32 32', // rgb(32, 32, 32) - Card background
    '--color-background-300': '42 42 42', // rgb(42, 42, 42) - Hover state
    '--color-background-400': '54 54 54', // rgb(54, 54, 54) - Active state
    '--color-background-500': '68 68 68', // rgb(68, 68, 68) - Disabled state
    '--color-background-600': '84 84 84', // rgb(84, 84, 84) - Border color
    '--color-background-700': '115 115 115', // rgb(115, 115, 115) - Muted text background
    '--color-background-800': '145 145 145', // rgb(145, 145, 145) - Light text background
    '--color-background-900': '180 180 180', // rgb(180, 180, 180) - Lighter elements
    '--color-background-950': '220 220 220', // rgb(220, 220, 220) - Lightest elements

    /* Background Special */
    '--color-background-error': '66 43 43', // rgb(66, 43, 43)
    '--color-background-warning': '65 47 35', // rgb(65, 47, 35)
    '--color-background-success': '28 43 33', // rgb(28, 43, 33)
    '--color-background-muted': '51 51 51', // rgb(51, 51, 51)
    '--color-background-info': '26 40 46', // rgb(26, 40, 46)

    /* Focus Ring Indicator  */
    '--color-indicator-primary': '247 247 247', // rgb(247, 247, 247)
    '--color-indicator-info': '161 199 245', // rgb(161, 199, 245)
    '--color-indicator-error': '232 70 69', // rgb(232, 70, 69)

    /* Accent Colors */
    '--color-accent-0': '23 37 84', // rgb(23, 37, 84) - Darkest accent
    '--color-accent-50': '30 48 110', // rgb(30, 48, 110)
    '--color-accent-100': '30 58 138', // rgb(30, 58, 138)
    '--color-accent-200': '30 64 175', // rgb(30, 64, 175)
    '--color-accent-300': '29 78 216', // rgb(29, 78, 216)
    '--color-accent-400': '37 99 235', // rgb(37, 99, 235)
    '--color-accent-500': '59 130 246', // rgb(59, 130, 246) - Primary accent
    '--color-accent-600': '96 165 250', // rgb(96, 165, 250)
    '--color-accent-700': '147 197 253', // rgb(147, 197, 253)
    '--color-accent-800': '191 219 254', // rgb(191, 219, 254)
    '--color-accent-900': '219 234 254', // rgb(219, 234, 254)
    '--color-accent-950': '239 246 255', // rgb(239, 246, 255) - Lightest accent
  }),
};
