const QR_VERSION = 4;
const QR_SIZE = 33;
const QR_DATA_CODEWORDS = 80;
const QR_ERROR_CODEWORDS = 20;
const QR_ALIGNMENT_POSITIONS = [6, 26];
const QR_ERROR_LEVEL_BITS = {
  L: 1,
};

const GF_EXP_TABLE = new Array(512);
const GF_LOG_TABLE = new Array(256);
const GENERATOR_CACHE = new Map();

(function initializeGaloisTables() {
  let fieldValue = 1;
  for (let tableIndex = 0; tableIndex < 255; tableIndex += 1) {
    GF_EXP_TABLE[tableIndex] = fieldValue;
    GF_LOG_TABLE[fieldValue] = tableIndex;
    fieldValue <<= 1;
    if (fieldValue & 0x100) {
      fieldValue ^= 0x11d;
    }
  }

  for (let tableIndex = 255; tableIndex < 512; tableIndex += 1) {
    GF_EXP_TABLE[tableIndex] = GF_EXP_TABLE[tableIndex - 255];
  }
}());

function galoisMultiply(leftValue, rightValue) {
  if (leftValue === 0 || rightValue === 0) {
    return 0;
  }
  return GF_EXP_TABLE[GF_LOG_TABLE[leftValue] + GF_LOG_TABLE[rightValue]];
}

function multiplyPolynomials(leftPolynomial, rightPolynomial) {
  const result = new Array(leftPolynomial.length + rightPolynomial.length - 1).fill(0);

  for (let leftIndex = 0; leftIndex < leftPolynomial.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < rightPolynomial.length; rightIndex += 1) {
      result[leftIndex + rightIndex] ^= galoisMultiply(leftPolynomial[leftIndex], rightPolynomial[rightIndex]);
    }
  }

  return result;
}

function buildGeneratorPolynomial(degree) {
  if (GENERATOR_CACHE.has(degree)) {
    return GENERATOR_CACHE.get(degree);
  }

  let generator = [1];
  for (let exponentIndex = 0; exponentIndex < degree; exponentIndex += 1) {
    generator = multiplyPolynomials(generator, [1, GF_EXP_TABLE[exponentIndex]]);
  }

  GENERATOR_CACHE.set(degree, generator);
  return generator;
}

function createMatrix(size) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function createReservedMatrix(size) {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice());
}

function withinMatrix(rowIndex, columnIndex) {
  return rowIndex >= 0 && rowIndex < QR_SIZE && columnIndex >= 0 && columnIndex < QR_SIZE;
}

function reserveCell(matrix, reservedMatrix, rowIndex, columnIndex, value) {
  if (!withinMatrix(rowIndex, columnIndex)) {
    return;
  }
  matrix[rowIndex][columnIndex] = value;
  reservedMatrix[rowIndex][columnIndex] = true;
}

function markReservedOnly(reservedMatrix, rowIndex, columnIndex) {
  if (!withinMatrix(rowIndex, columnIndex)) {
    return;
  }
  reservedMatrix[rowIndex][columnIndex] = true;
}

function drawFinderPattern(matrix, reservedMatrix, topRow, leftColumn) {
  for (let rowOffset = -1; rowOffset <= 7; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 7; columnOffset += 1) {
      const rowIndex = topRow + rowOffset;
      const columnIndex = leftColumn + columnOffset;
      if (!withinMatrix(rowIndex, columnIndex)) {
        continue;
      }

      reservedMatrix[rowIndex][columnIndex] = true;
      if (rowOffset < 0 || rowOffset > 6 || columnOffset < 0 || columnOffset > 6) {
        matrix[rowIndex][columnIndex] = 0;
        continue;
      }

      const isDarkModule = rowOffset === 0
        || rowOffset === 6
        || columnOffset === 0
        || columnOffset === 6
        || (rowOffset >= 2 && rowOffset <= 4 && columnOffset >= 2 && columnOffset <= 4);
      matrix[rowIndex][columnIndex] = isDarkModule ? 1 : 0;
    }
  }
}

function drawAlignmentPattern(matrix, reservedMatrix, centerRow, centerColumn) {
  for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
    for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
      const rowIndex = centerRow + rowOffset;
      const columnIndex = centerColumn + columnOffset;
      if (!withinMatrix(rowIndex, columnIndex)) {
        continue;
      }

      const distance = Math.max(Math.abs(rowOffset), Math.abs(columnOffset));
      const isDarkModule = distance === 2 || (rowOffset === 0 && columnOffset === 0);
      matrix[rowIndex][columnIndex] = isDarkModule ? 1 : 0;
      reservedMatrix[rowIndex][columnIndex] = true;
    }
  }
}

function drawTimingPatterns(matrix, reservedMatrix) {
  for (let index = 8; index < QR_SIZE - 8; index += 1) {
    const isDarkModule = index % 2 === 0;
    matrix[6][index] = isDarkModule ? 1 : 0;
    matrix[index][6] = isDarkModule ? 1 : 0;
    reservedMatrix[6][index] = true;
    reservedMatrix[index][6] = true;
  }
}

function drawDarkModule(matrix, reservedMatrix) {
  const rowIndex = 4 * QR_VERSION + 9;
  const columnIndex = 8;
  matrix[rowIndex][columnIndex] = 1;
  reservedMatrix[rowIndex][columnIndex] = true;
}

function reserveFormatInfoAreas(reservedMatrix) {
  for (let bitIndex = 0; bitIndex < 15; bitIndex += 1) {
    if (bitIndex < 6) {
      markReservedOnly(reservedMatrix, bitIndex, 8);
    } else if (bitIndex < 8) {
      markReservedOnly(reservedMatrix, bitIndex + 1, 8);
    } else {
      markReservedOnly(reservedMatrix, QR_SIZE - 15 + bitIndex, 8);
    }
  }

  for (let bitIndex = 0; bitIndex < 15; bitIndex += 1) {
    if (bitIndex < 8) {
      markReservedOnly(reservedMatrix, 8, QR_SIZE - bitIndex - 1);
    } else if (bitIndex === 8) {
      markReservedOnly(reservedMatrix, 8, 7);
    } else {
      markReservedOnly(reservedMatrix, 8, 15 - bitIndex - 1);
    }
  }
}

function applyFormatInfo(matrix, maskPattern) {
  const formatBits = getBchTypeInfo((QR_ERROR_LEVEL_BITS.L << 3) | maskPattern);

  for (let bitIndex = 0; bitIndex < 15; bitIndex += 1) {
    const moduleValue = (formatBits >> bitIndex) & 1;
    if (bitIndex < 6) {
      matrix[bitIndex][8] = moduleValue;
    } else if (bitIndex < 8) {
      matrix[bitIndex + 1][8] = moduleValue;
    } else {
      matrix[QR_SIZE - 15 + bitIndex][8] = moduleValue;
    }
  }

  for (let bitIndex = 0; bitIndex < 15; bitIndex += 1) {
    const moduleValue = (formatBits >> bitIndex) & 1;
    if (bitIndex < 8) {
      matrix[8][QR_SIZE - bitIndex - 1] = moduleValue;
    } else if (bitIndex === 8) {
      matrix[8][7] = moduleValue;
    } else {
      matrix[8][15 - bitIndex - 1] = moduleValue;
    }
  }
}

function getBchDigit(value) {
  let digitCount = 0;
  let remainingValue = value;
  while (remainingValue !== 0) {
    digitCount += 1;
    remainingValue >>>= 1;
  }
  return digitCount;
}

function getBchTypeInfo(data) {
  let shiftedData = data << 10;
  while (getBchDigit(shiftedData) - getBchDigit(0x537) >= 0) {
    shiftedData ^= 0x537 << (getBchDigit(shiftedData) - getBchDigit(0x537));
  }
  return ((data << 10) | shiftedData) ^ 0x5412;
}

function encodeUtf8(text) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(String(text));
  }
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(String(text), 'utf8'));
  }
  return Uint8Array.from(String(text).split('').map((character) => character.charCodeAt(0)));
}

class BitBuffer {
  constructor() {
    this.bits = [];
  }

  get length() {
    return this.bits.length;
  }

  put(value, length) {
    for (let bitIndex = length - 1; bitIndex >= 0; bitIndex -= 1) {
      this.bits.push((value >>> bitIndex) & 1);
    }
  }

  putBit(bitValue) {
    this.bits.push(bitValue ? 1 : 0);
  }

  toBytes() {
    const byteLength = Math.ceil(this.bits.length / 8);
    const bytes = new Uint8Array(byteLength);
    for (let bitIndex = 0; bitIndex < this.bits.length; bitIndex += 1) {
      if (this.bits[bitIndex]) {
        bytes[bitIndex >> 3] |= 0x80 >> (bitIndex & 7);
      }
    }
    return bytes;
  }
}

function buildDataCodewords(text) {
  const payloadBytes = encodeUtf8(text);
  const buffer = new BitBuffer();
  buffer.put(0b0100, 4);
  buffer.put(payloadBytes.length, 8);
  for (const payloadByte of payloadBytes) {
    buffer.put(payloadByte, 8);
  }

  const totalBits = QR_DATA_CODEWORDS * 8;
  if (buffer.length > totalBits) {
    throw new Error('二维码内容过长');
  }

  const remainingBits = totalBits - buffer.length;
  buffer.put(0, Math.min(4, remainingBits));
  while (buffer.length % 8 !== 0) {
    buffer.putBit(0);
  }

  let usePadByteEc = true;
  while (buffer.length < totalBits) {
    buffer.put(usePadByteEc ? 0xEC : 0x11, 8);
    usePadByteEc = !usePadByteEc;
  }

  return buffer.toBytes();
}

function buildErrorCorrectionCodewords(dataCodewords) {
  const generatorPolynomial = buildGeneratorPolynomial(QR_ERROR_CODEWORDS);
  const messageBytes = new Uint8Array(QR_DATA_CODEWORDS + QR_ERROR_CODEWORDS);
  messageBytes.set(dataCodewords, 0);

  for (let dataIndex = 0; dataIndex < QR_DATA_CODEWORDS; dataIndex += 1) {
    const coefficient = messageBytes[dataIndex];
    if (coefficient === 0) {
      continue;
    }

    for (let generatorIndex = 0; generatorIndex < generatorPolynomial.length; generatorIndex += 1) {
      messageBytes[dataIndex + generatorIndex] ^= galoisMultiply(generatorPolynomial[generatorIndex], coefficient);
    }
  }

  return messageBytes.slice(QR_DATA_CODEWORDS);
}

function getMaskFunction(maskPattern) {
  switch (maskPattern) {
    case 0:
      return (rowIndex, columnIndex) => (rowIndex + columnIndex) % 2 === 0;
    case 1:
      return (rowIndex) => rowIndex % 2 === 0;
    case 2:
      return (_rowIndex, columnIndex) => columnIndex % 3 === 0;
    case 3:
      return (rowIndex, columnIndex) => (rowIndex + columnIndex) % 3 === 0;
    case 4:
      return (rowIndex, columnIndex) => (Math.floor(rowIndex / 2) + Math.floor(columnIndex / 3)) % 2 === 0;
    case 5:
      return (rowIndex, columnIndex) => ((rowIndex * columnIndex) % 2 + (rowIndex * columnIndex) % 3) === 0;
    case 6:
      return (rowIndex, columnIndex) => (((rowIndex * columnIndex) % 2 + (rowIndex * columnIndex) % 3) % 2) === 0;
    case 7:
      return (rowIndex, columnIndex) => (((rowIndex + columnIndex) % 2 + (rowIndex * columnIndex) % 3) % 2) === 0;
    default:
      return () => false;
  }
}

function placeCodewords(matrix, reservedMatrix, allCodewords, maskPattern) {
  const maskFunction = getMaskFunction(maskPattern);
  let bitIndex = 0;
  let currentColumn = QR_SIZE - 1;
  let goingUp = true;

  while (currentColumn > 0) {
    if (currentColumn === 6) {
      currentColumn -= 1;
    }

    for (let rowOffset = 0; rowOffset < QR_SIZE; rowOffset += 1) {
      const rowIndex = goingUp ? QR_SIZE - 1 - rowOffset : rowOffset;
      for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
        const targetColumn = currentColumn - columnOffset;
        if (reservedMatrix[rowIndex][targetColumn]) {
          continue;
        }

        let bitValue = 0;
        if (bitIndex < allCodewords.length * 8) {
          const codewordIndex = bitIndex >> 3;
          const shiftAmount = 7 - (bitIndex & 7);
          bitValue = (allCodewords[codewordIndex] >> shiftAmount) & 1;
        }

        if (maskFunction(rowIndex, targetColumn)) {
          bitValue ^= 1;
        }

        matrix[rowIndex][targetColumn] = bitValue;
        bitIndex += 1;
      }
    }

    goingUp = !goingUp;
    currentColumn -= 2;
  }
}

function scoreMatrix(matrix) {
  let penaltyScore = 0;
  const size = matrix.length;

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    let runColor = matrix[rowIndex][0];
    let runLength = 1;
    for (let columnIndex = 1; columnIndex < size; columnIndex += 1) {
      const moduleValue = matrix[rowIndex][columnIndex];
      if (moduleValue === runColor) {
        runLength += 1;
      } else {
        if (runLength >= 5) {
          penaltyScore += 3 + (runLength - 5);
        }
        runColor = moduleValue;
        runLength = 1;
      }
    }
    if (runLength >= 5) {
      penaltyScore += 3 + (runLength - 5);
    }
  }

  for (let columnIndex = 0; columnIndex < size; columnIndex += 1) {
    let runColor = matrix[0][columnIndex];
    let runLength = 1;
    for (let rowIndex = 1; rowIndex < size; rowIndex += 1) {
      const moduleValue = matrix[rowIndex][columnIndex];
      if (moduleValue === runColor) {
        runLength += 1;
      } else {
        if (runLength >= 5) {
          penaltyScore += 3 + (runLength - 5);
        }
        runColor = moduleValue;
        runLength = 1;
      }
    }
    if (runLength >= 5) {
      penaltyScore += 3 + (runLength - 5);
    }
  }

  for (let rowIndex = 0; rowIndex < size - 1; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < size - 1; columnIndex += 1) {
      const moduleValue = matrix[rowIndex][columnIndex];
      if (
        moduleValue === matrix[rowIndex][columnIndex + 1]
        && moduleValue === matrix[rowIndex + 1][columnIndex]
        && moduleValue === matrix[rowIndex + 1][columnIndex + 1]
      ) {
        penaltyScore += 3;
      }
    }
  }

  const finderPattern = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const inverseFinderPattern = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const patterns = [finderPattern, inverseFinderPattern];

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex <= size - 11; columnIndex += 1) {
      const slice = matrix[rowIndex].slice(columnIndex, columnIndex + 11);
      for (const pattern of patterns) {
        if (pattern.every((expectedValue, patternIndex) => expectedValue === slice[patternIndex])) {
          penaltyScore += 40;
        }
      }
    }
  }

  for (let columnIndex = 0; columnIndex < size; columnIndex += 1) {
    for (let rowIndex = 0; rowIndex <= size - 11; rowIndex += 1) {
      const slice = [];
      for (let offset = 0; offset < 11; offset += 1) {
        slice.push(matrix[rowIndex + offset][columnIndex]);
      }
      for (const pattern of patterns) {
        if (pattern.every((expectedValue, patternIndex) => expectedValue === slice[patternIndex])) {
          penaltyScore += 40;
        }
      }
    }
  }

  let darkModuleCount = 0;
  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < size; columnIndex += 1) {
      if (matrix[rowIndex][columnIndex]) {
        darkModuleCount += 1;
      }
    }
  }

  const totalModules = size * size;
  const darkPercentage = (darkModuleCount * 100) / totalModules;
  const deviation = Math.abs(darkPercentage - 50) / 5;
  penaltyScore += Math.floor(deviation) * 10;

  return penaltyScore;
}

function createBaseMatrix() {
  const matrix = createMatrix(QR_SIZE);
  const reservedMatrix = createReservedMatrix(QR_SIZE);

  drawFinderPattern(matrix, reservedMatrix, 0, 0);
  drawFinderPattern(matrix, reservedMatrix, 0, QR_SIZE - 7);
  drawFinderPattern(matrix, reservedMatrix, QR_SIZE - 7, 0);

  for (const centerRow of QR_ALIGNMENT_POSITIONS) {
    for (const centerColumn of QR_ALIGNMENT_POSITIONS) {
      if (reservedMatrix[centerRow][centerColumn]) {
        continue;
      }
      drawAlignmentPattern(matrix, reservedMatrix, centerRow, centerColumn);
    }
  }

  drawTimingPatterns(matrix, reservedMatrix);
  drawDarkModule(matrix, reservedMatrix);
  reserveFormatInfoAreas(reservedMatrix);

  return { matrix, reservedMatrix };
}

function buildQrMatrix(text) {
  const dataCodewords = buildDataCodewords(text);
  const errorCorrectionCodewords = buildErrorCorrectionCodewords(dataCodewords);
  const allCodewords = new Uint8Array(QR_DATA_CODEWORDS + QR_ERROR_CODEWORDS);
  allCodewords.set(dataCodewords, 0);
  allCodewords.set(errorCorrectionCodewords, QR_DATA_CODEWORDS);

  const base = createBaseMatrix();
  let bestMatrix = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let maskPattern = 0; maskPattern < 8; maskPattern += 1) {
    const candidateMatrix = cloneMatrix(base.matrix);
    placeCodewords(candidateMatrix, base.reservedMatrix, allCodewords, maskPattern);
    applyFormatInfo(candidateMatrix, maskPattern);
    const candidateScore = scoreMatrix(candidateMatrix);
    if (candidateScore < bestScore) {
      bestScore = candidateScore;
      bestMatrix = candidateMatrix;
    }
  }

  return bestMatrix;
}

function renderSvg(matrix, options = {}) {
  const moduleMargin = Number.isFinite(Number(options.margin)) ? Math.max(0, Number(options.margin)) : 4;
  const outputSize = Number.isFinite(Number(options.width)) ? Math.max(32, Number(options.width)) : 240;
  const darkColor = options.color?.dark || '#000000';
  const lightColor = options.color?.light || '#ffffff';
  const totalModules = matrix.length + moduleMargin * 2;
  const svgPieces = [];

  svgPieces.push('<?xml version="1.0" encoding="UTF-8"?>');
  svgPieces.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputSize}" height="${outputSize}" viewBox="0 0 ${totalModules} ${totalModules}" shape-rendering="crispEdges">`);
  svgPieces.push(`<rect width="100%" height="100%" fill="${lightColor}"/>`);

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < matrix[rowIndex].length; columnIndex += 1) {
      if (!matrix[rowIndex][columnIndex]) {
        continue;
      }
      svgPieces.push(`<rect x="${columnIndex + moduleMargin}" y="${rowIndex + moduleMargin}" width="1" height="1" fill="${darkColor}"/>`);
    }
  }

  svgPieces.push('</svg>');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPieces.join(''))}`;
}

export async function toDataURL(text, options = {}) {
  const matrix = buildQrMatrix(String(text || ''));
  return renderSvg(matrix, options);
}

export async function toString(text, options = {}) {
  const matrix = buildQrMatrix(String(text || ''));
  const moduleMargin = Number.isFinite(Number(options.margin)) ? Math.max(0, Number(options.margin)) : 4;
  const darkColor = options.color?.dark || '#000000';
  const lightColor = options.color?.light || '#ffffff';
  const totalModules = matrix.length + moduleMargin * 2;
  const svgPieces = [];

  svgPieces.push('<?xml version="1.0" encoding="UTF-8"?>');
  svgPieces.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" shape-rendering="crispEdges">`);
  svgPieces.push(`<rect width="100%" height="100%" fill="${lightColor}"/>`);

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < matrix[rowIndex].length; columnIndex += 1) {
      if (!matrix[rowIndex][columnIndex]) {
        continue;
      }
      svgPieces.push(`<rect x="${columnIndex + moduleMargin}" y="${rowIndex + moduleMargin}" width="1" height="1" fill="${darkColor}"/>`);
    }
  }

  svgPieces.push('</svg>');
  return svgPieces.join('');
}

export async function toCanvas(text, options = {}, canvasElement) {
  const dataUrl = await toDataURL(text, options);
  if (!canvasElement || typeof canvasElement.getContext !== 'function') {
    return dataUrl;
  }

  return new Promise((resolve, reject) => {
    const imageElement = new Image();
    imageElement.onload = () => {
      canvasElement.width = imageElement.width;
      canvasElement.height = imageElement.height;
      const canvasContext = canvasElement.getContext('2d');
      if (!canvasContext) {
        reject(new Error('Canvas 上下文不可用'));
        return;
      }
      canvasContext.drawImage(imageElement, 0, 0);
      resolve(canvasElement);
    };
    imageElement.onerror = () => reject(new Error('二维码渲染失败'));
    imageElement.src = dataUrl;
  });
}

const QRCode = {
  toDataURL,
  toString,
  toCanvas,
};

export default QRCode;
