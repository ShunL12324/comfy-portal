/**
 * Below are the colors that are used in the app. The colors are defined in HEX format as the single source of truth.
 * These values are then converted to RGB in the gluestack config.
 */

export const Colors = {
  light: {
    primary: {
      0: '#B3B3B3',   // 179, 179, 179
      50: '#999999',  // 153, 153, 153
      100: '#808080', // 128, 128, 128
      200: '#737373', // 115, 115, 115
      300: '#666666', // 102, 102, 102
      400: '#525252', // 82, 82, 82
      500: '#333333', // 51, 51, 51
      600: '#292929', // 41, 41, 41
      700: '#1F1F1F', // 31, 31, 31
      800: '#0D0D0D', // 13, 13, 13
      900: '#0A0A0A', // 10, 10, 10
      950: '#080808', // 8, 8, 8
    },
    secondary: {
      0: '#FDFDFD',   // 253, 253, 253
      50: '#FBFBFB',  // 251, 251, 251
      100: '#F6F6F6', // 246, 246, 246
      200: '#F2F2F2', // 242, 242, 242
      300: '#EDEDED', // 237, 237, 237
      400: '#E6E6E7', // 230, 230, 231
      500: '#D9D9DB', // 217, 217, 219
      600: '#C6C7C7', // 198, 199, 199
      700: '#BDBDBD', // 189, 189, 189
      800: '#B1B1B1', // 177, 177, 177
      900: '#A5A4A4', // 165, 164, 164
      950: '#9D9D9D', // 157, 157, 157
    },
    tertiary: {
      0: '#FFFAF5',   // 255, 250, 245
      50: '#FFF2E5',  // 255, 242, 229
      100: '#FFE9D5', // 255, 233, 213
      200: '#FED1AA', // 254, 209, 170
      300: '#FDB474', // 253, 180, 116
      400: '#FB9D4B', // 251, 157, 75
      500: '#E78128', // 231, 129, 40
      600: '#D7751F', // 215, 117, 31
      700: '#B4621A', // 180, 98, 26
      800: '#824917', // 130, 73, 23
      900: '#6C3D13', // 108, 61, 19
      950: '#543112', // 84, 49, 18
    },
    error: {
      0: '#FEE9E9',   // 254, 233, 233
      50: '#FEE2E2',  // 254, 226, 226
      100: '#FECACA', // 254, 202, 202
      200: '#FCA5A5', // 252, 165, 165
      300: '#F87171', // 248, 113, 113
      400: '#EF4444', // 239, 68, 68
      500: '#E63535', // 230, 53, 53
      600: '#DC2626', // 220, 38, 38
      700: '#B91C1C', // 185, 28, 28
      800: '#991B1B', // 153, 27, 27
      900: '#7F1D1D', // 127, 29, 29
      950: '#531313', // 83, 19, 19
    },
    success: {
      0: '#E4FFF4',   // 228, 255, 244
      50: '#CAFFE8',  // 202, 255, 232
      100: '#A2F1C0', // 162, 241, 192
      200: '#84D3A2', // 132, 211, 162
      300: '#66B584', // 102, 181, 132
      400: '#489766', // 72, 151, 102
      500: '#348352', // 52, 131, 82
      600: '#2A7948', // 42, 121, 72
      700: '#206F3E', // 32, 111, 62
      800: '#166534', // 22, 101, 52
      900: '#14532D', // 20, 83, 45
      950: '#1B3224', // 27, 50, 36
    },
    warning: {
      0: '#FFF9F5',   // 255, 249, 245
      50: '#FFF4EC',  // 255, 244, 236
      100: '#FFE7D5', // 255, 231, 213
      200: '#FECDAA', // 254, 205, 170
      300: '#FDAD74', // 253, 173, 116
      400: '#FB954B', // 251, 149, 75
      500: '#E77828', // 231, 120, 40
      600: '#D76C1F', // 215, 108, 31
      700: '#B45A1A', // 180, 90, 26
      800: '#824417', // 130, 68, 23
      900: '#6C3813', // 108, 56, 19
      950: '#542D12', // 84, 45, 18
    },
    info: {
      0: '#ECF8FE',   // 236, 248, 254
      50: '#C7EBFC',  // 199, 235, 252
      100: '#A2DDFA', // 162, 221, 250
      200: '#7CCFF8', // 124, 207, 248
      300: '#57C2F6', // 87, 194, 246
      400: '#32B4F4', // 50, 180, 244
      500: '#0DA6F2', // 13, 166, 242
      600: '#0B8DCD', // 11, 141, 205
      700: '#0973A8', // 9, 115, 168
      800: '#075A83', // 7, 90, 131
      900: '#05405D', // 5, 64, 93
      950: '#032638', // 3, 38, 56
    },
    typography: {
      0: '#FEFEFF',   // 254, 254, 255
      50: '#F5F5F5',  // 245, 245, 245
      100: '#E5E5E5', // 229, 229, 229
      200: '#DBDBDC', // 219, 219, 220
      300: '#D4D4D4', // 212, 212, 212
      400: '#A3A3A3', // 163, 163, 163
      500: '#8C8C8C', // 140, 140, 140
      600: '#737373', // 115, 115, 115
      700: '#525252', // 82, 82, 82
      800: '#404040', // 64, 64, 64
      900: '#262627', // 38, 38, 39
      950: '#171717', // 23, 23, 23
    },
    outline: {
      0: '#FDFEFE',   // 253, 254, 254
      50: '#F3F3F3',  // 243, 243, 243
      100: '#E6E6E6', // 230, 230, 230
      200: '#DDDCDB', // 221, 220, 219
      300: '#D3D3D3', // 211, 211, 211
      400: '#A5A3A3', // 165, 163, 163
      500: '#8C8D8D', // 140, 141, 141
      600: '#737474', // 115, 116, 116
      700: '#535252', // 83, 82, 82
      800: '#414141', // 65, 65, 65
      900: '#272624', // 39, 38, 36
      950: '#1A1717', // 26, 23, 23
    },
    background: {
      0: '#FFFFFF',   // 255, 255, 255
      50: '#F6F6F6',  // 246, 246, 246
      100: '#F2F1F1', // 242, 241, 241
      200: '#EBEBEB', // 235, 235, 235
      300: '#D5D4D4', // 213, 212, 212
      400: '#A2A3A3', // 162, 163, 163
      500: '#8E8E8E', // 142, 142, 142
      600: '#747474', // 116, 116, 116
      700: '#535252', // 83, 82, 82
      800: '#414040', // 65, 64, 64
      900: '#272625', // 39, 38, 37
      950: '#121212', // 18, 18, 18
    },
    accent: {
      0: '#D6E8FF',   // 214, 232, 255 - Lightest tech blue
      50: '#A3D1FF',  // 163, 209, 255
      100: '#66B3FF',  // 102, 179, 255
      200: '#3399FF',  // 51, 153, 255
      300: '#0D92F4',  // 13, 146, 244 - Original tech blue
      400: '#0077FF',  // 0, 119, 255
      500: '#0066FF',  // 0, 102, 255
      600: '#0052FF',  // 0, 82, 255
      700: '#0044FF',  // 0, 68, 255
      800: '#0033E6',  // 0, 51, 230
      900: '#0029CC',  // 0, 41, 204
      950: '#001F99',  // 0, 31, 153 - Darkest tech blue
    }
  },
  dark: {
    primary: {
      0: '#404040',   // 64, 64, 64
      50: '#525252',  // 82, 82, 82
      100: '#737373', // 115, 115, 115
      200: '#8C8C8C', // 140, 140, 140
      300: '#A3A3A3', // 163, 163, 163
      400: '#C2C2C2', // 194, 194, 194
      500: '#E0E0E0', // 224, 224, 224
      600: '#EBEBEB', // 235, 235, 235
      700: '#F5F5F5', // 245, 245, 245
      800: '#F8F8F8', // 248, 248, 248
      900: '#FAFAFA', // 250, 250, 250
      950: '#FFFFFF', // 255, 255, 255
    },
    secondary: {
      0: '#9D9D9D',   // 157, 157, 157
      50: '#A5A4A4',  // 165, 164, 164
      100: '#B1B1B1', // 177, 177, 177
      200: '#BDBDBD', // 189, 189, 189
      300: '#C6C7C7', // 198, 199, 199
      400: '#D9D9DB', // 217, 217, 219
      500: '#E6E6E7', // 230, 230, 231
      600: '#EDEDED', // 237, 237, 237
      700: '#F2F2F2', // 242, 242, 242
      800: '#F6F6F6', // 246, 246, 246
      900: '#FBFBFB', // 251, 251, 251
      950: '#FDFDFD', // 253, 253, 253
    },
    tertiary: {
      0: '#543112',   // 84, 49, 18
      50: '#6C3D13',  // 108, 61, 19
      100: '#824917', // 130, 73, 23
      200: '#B4621A', // 180, 98, 26
      300: '#D7751F', // 215, 117, 31
      400: '#E78128', // 231, 129, 40
      500: '#FB9D4B', // 251, 157, 75
      600: '#FDB474', // 253, 180, 116
      700: '#FED1AA', // 254, 209, 170
      800: '#FFE9D5', // 255, 233, 213
      900: '#FFF2E5', // 255, 242, 229
      950: '#FFFAF5', // 255, 250, 245
    },
    error: {
      0: '#531313',   // 83, 19, 19
      50: '#7F1D1D',  // 127, 29, 29
      100: '#991B1B', // 153, 27, 27
      200: '#B91C1C', // 185, 28, 28
      300: '#DC2626', // 220, 38, 38
      400: '#E63535', // 230, 53, 53
      500: '#EF4444', // 239, 68, 68
      600: '#F87171', // 248, 113, 113
      700: '#FCA5A5', // 252, 165, 165
      800: '#FECACA', // 254, 202, 202
      900: '#FEE2E2', // 254, 226, 226
      950: '#FEE9E9', // 254, 233, 233
    },
    success: {
      0: '#1B3224',   // 27, 50, 36
      50: '#14532D',  // 20, 83, 45
      100: '#166534', // 22, 101, 52
      200: '#206F3E', // 32, 111, 62
      300: '#2A7948', // 42, 121, 72
      400: '#348352', // 52, 131, 82
      500: '#489766', // 72, 151, 102
      600: '#66B584', // 102, 181, 132
      700: '#84D3A2', // 132, 211, 162
      800: '#A2F1C0', // 162, 241, 192
      900: '#CAFFE8', // 202, 255, 232
      950: '#E4FFF4', // 228, 255, 244
    },
    warning: {
      0: '#542D12',   // 84, 45, 18
      50: '#6C3813',  // 108, 56, 19
      100: '#824417', // 130, 68, 23
      200: '#B45A1A', // 180, 90, 26
      300: '#D76C1F', // 215, 108, 31
      400: '#E77828', // 231, 120, 40
      500: '#FB954B', // 251, 149, 75
      600: '#FDAD74', // 253, 173, 116
      700: '#FECDAA', // 254, 205, 170
      800: '#FFE7D5', // 255, 231, 213
      900: '#FFF4EC', // 255, 244, 236
      950: '#FFF9F5', // 255, 249, 245
    },
    info: {
      0: '#032638',   // 3, 38, 56
      50: '#05405D',  // 5, 64, 93
      100: '#075A83', // 7, 90, 131
      200: '#0973A8', // 9, 115, 168
      300: '#0B8DCD', // 11, 141, 205
      400: '#0DA6F2', // 13, 166, 242
      500: '#32B4F4', // 50, 180, 244
      600: '#57C2F6', // 87, 194, 246
      700: '#7CCFF8', // 124, 207, 248
      800: '#A2DDFA', // 162, 221, 250
      900: '#C7EBFC', // 199, 235, 252
      950: '#ECF8FE', // 236, 248, 254
    },
    typography: {
      0: '#171717',   // 23, 23, 23
      50: '#262627',  // 38, 38, 39
      100: '#404040', // 64, 64, 64
      200: '#525252', // 82, 82, 82
      300: '#737373', // 115, 115, 115
      400: '#8C8C8C', // 140, 140, 140
      500: '#A3A3A3', // 163, 163, 163
      600: '#D4D4D4', // 212, 212, 212
      700: '#DBDBDC', // 219, 219, 220
      800: '#E5E5E5', // 229, 229, 229
      900: '#F5F5F5', // 245, 245, 245
      950: '#FEFEFF', // 254, 254, 255
    },
    outline: {
      0: '#1A1717',   // 26, 23, 23
      50: '#272624',  // 39, 38, 36
      100: '#414141', // 65, 65, 65
      200: '#535252', // 83, 82, 82
      300: '#737474', // 115, 116, 116
      400: '#8C8D8D', // 140, 141, 141
      500: '#A5A3A3', // 165, 163, 163
      600: '#D3D3D3', // 211, 211, 211
      700: '#DDDCDB', // 221, 220, 219
      800: '#E6E6E6', // 230, 230, 230
      900: '#F3F3F3', // 243, 243, 243
      950: '#FDFEFE', // 253, 254, 254
    },
    background: {
      0: '#121212',   // 18, 18, 18
      50: '#1A1A1A',  // 26, 26, 26
      100: '#202020', // 32, 32, 32
      200: '#282828', // 40, 40, 40
      300: '#3D3D3D', // 61, 61, 61
      400: '#525252', // 82, 82, 82
      500: '#666666', // 102, 102, 102
      600: '#808080', // 128, 128, 128
      700: '#A0A0A0', // 160, 160, 160
      800: '#C0C0C0', // 192, 192, 192
      900: '#E0E0E0', // 224, 224, 224
      950: '#FFFFFF', // 255, 255, 255
    },
    accent: {
      0: '#D6E8FF',   // 214, 232, 255 - Lightest tech blue
      50: '#A3D1FF',  // 163, 209, 255
      100: '#66B3FF',  // 102, 179, 255
      200: '#3399FF',  // 51, 153, 255
      300: '#0D92F4',  // 13, 146, 244 - Original tech blue
      400: '#0077FF',  // 0, 119, 255
      500: '#0066FF',  // 0, 102, 255
      600: '#0052FF',  // 0, 82, 255
      700: '#0044FF',  // 0, 68, 255
      800: '#0033E6',  // 0, 51, 230
      900: '#0029CC',  // 0, 41, 204
      950: '#001F99',  // 0, 31, 153 - Darkest tech blue
    }
  }
};
