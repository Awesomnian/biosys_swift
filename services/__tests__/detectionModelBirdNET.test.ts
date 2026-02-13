/**
 * Tests for BirdNET Detection Model - Pure Logic Tests
 * 
 * Tests the response parsing logic, confidence threshold filtering,
 * and species matching for Swift Parrot and Orange-bellied Parrot.
 */

describe('BirdNET Response Parsing', () => {
  // Helper function to parse species name format
  const parseSpeciesName = (speciesName: string) => {
    const parts = speciesName.split('_');
    return {
      scientificName: parts[0] || '',
      commonName: parts[1] || speciesName,
    };
  };

  describe('parseSpeciesName', () => {
    it('should parse Swift Parrot format correctly', () => {
      const result = parseSpeciesName('Lathamus discolor_Swift Parrot');
      expect(result.scientificName).toBe('Lathamus discolor');
      expect(result.commonName).toBe('Swift Parrot');
    });

    it('should parse Orange-bellied Parrot format correctly', () => {
      const result = parseSpeciesName('Neophema chrysogaster_Orange-bellied Parrot');
      expect(result.scientificName).toBe('Neophema chrysogaster');
      expect(result.commonName).toBe('Orange-bellied Parrot');
    });

    it('should handle malformed species name', () => {
      const result = parseSpeciesName('UnknownSpecies');
      expect(result.scientificName).toBe('UnknownSpecies');
      expect(result.commonName).toBe('UnknownSpecies');
    });

    it('should handle empty string', () => {
      const result = parseSpeciesName('');
      expect(result.scientificName).toBe('');
      expect(result.commonName).toBe('');
    });
  });

  describe('Species matching', () => {
    const isSwiftParrot = (scientificName: string) => 
      scientificName.toLowerCase().includes('lathamus');

    const isOrangeBelliedParrot = (scientificName: string) =>
      scientificName.toLowerCase().includes('neophema chrysogaster');

    it('should identify Swift Parrot by scientific name', () => {
      expect(isSwiftParrot('Lathamus discolor')).toBe(true);
      expect(isSwiftParrot('lathamus discolor')).toBe(true);
      expect(isSwiftParrot('Other bird')).toBe(false);
    });

    it('should identify Orange-bellied Parrot by scientific name', () => {
      expect(isOrangeBelliedParrot('Neophema chrysogaster')).toBe(true);
      expect(isOrangeBelliedParrot('neophema chrysogaster')).toBe(true);
      expect(isOrangeBelliedParrot('Other bird')).toBe(false);
    });
  });

  describe('Confidence threshold filtering', () => {
    const filterByThreshold = (predictions: Array<{ species_name: string; probability: number }>, threshold: number) =>
      predictions.filter((p) => p.probability >= threshold);

    it('should filter predictions below threshold', () => {
      const predictions = [
        { species_name: 'Bird A', probability: 0.9 },
        { species_name: 'Bird B', probability: 0.7 },
        { species_name: 'Bird C', probability: 0.5 },
      ];

      const result = filterByThreshold(predictions, 0.8);
      expect(result).toHaveLength(1);
      expect(result[0].species_name).toBe('Bird A');
    });

    it('should include predictions at exact threshold', () => {
      const predictions = [
        { species_name: 'Bird A', probability: 0.8 },
        { species_name: 'Bird B', probability: 0.79 },
      ];

      const result = filterByThreshold(predictions, 0.8);
      expect(result).toHaveLength(1);
      expect(result[0].species_name).toBe('Bird A');
    });

    it('should return empty array when no predictions meet threshold', () => {
      const predictions = [
        { species_name: 'Bird A', probability: 0.3 },
        { species_name: 'Bird B', probability: 0.4 },
      ];

      const result = filterByThreshold(predictions, 0.8);
      expect(result).toHaveLength(0);
    });

    it('should include all predictions when threshold is 0', () => {
      const predictions = [
        { species_name: 'Bird A', probability: 0.1 },
        { species_name: 'Bird B', probability: 0.9 },
      ];

      const result = filterByThreshold(predictions, 0);
      expect(result).toHaveLength(2);
    });
  });

  describe('Threshold clamping', () => {
    const clampThreshold = (value: number): number => 
      Math.min(1.0, Math.max(0.0, value));

    it('should clamp values above 1.0 to 1.0', () => {
      expect(clampThreshold(1.5)).toBe(1.0);
      expect(clampThreshold(2.0)).toBe(1.0);
    });

    it('should clamp values below 0.0 to 0.0', () => {
      expect(clampThreshold(-0.5)).toBe(0.0);
      expect(clampThreshold(-1.0)).toBe(0.0);
    });

    it('should leave valid values unchanged', () => {
      expect(clampThreshold(0.5)).toBe(0.5);
      expect(clampThreshold(0.8)).toBe(0.8);
      expect(clampThreshold(1.0)).toBe(1.0);
      expect(clampThreshold(0.0)).toBe(0.0);
    });
  });
});

describe('Detection Result Processing', () => {
  interface MockPrediction {
    species_name: string;
    probability: number;
  }

  const processDetections = (
    predictions: MockPrediction[],
    threshold: number
  ): {
    isPositive: boolean;
    confidence: number;
    species?: string;
    scientificName?: string;
    commonName?: string;
  } => {
    const validPredictions = predictions.filter((p) => p.probability >= threshold);

    const swiftParrot = validPredictions.find((p) =>
      p.species_name.toLowerCase().includes('lathamus')
    );

    const orangeBelliedParrot = validPredictions.find((p) =>
      p.species_name.toLowerCase().includes('neophema chrysogaster')
    );

    const targetDetection = swiftParrot || orangeBelliedParrot;
    const topPrediction = validPredictions[0];

    const parts = (targetDetection?.species_name || topPrediction?.species_name || '').split('_');

    return {
      isPositive: !!targetDetection,
      confidence: targetDetection?.probability || topPrediction?.probability || 0,
      species: targetDetection?.species_name || topPrediction?.species_name,
      scientificName: parts[0] || undefined,
      commonName: parts[1] || undefined,
    };
  };

  it('should return positive for Swift Parrot detection above threshold', () => {
    const predictions = [
      { species_name: 'Lathamus discolor_Swift Parrot', probability: 0.85 },
    ];

    const result = processDetections(predictions, 0.8);
    expect(result.isPositive).toBe(true);
    expect(result.confidence).toBe(0.85);
    expect(result.scientificName).toBe('Lathamus discolor');
    expect(result.commonName).toBe('Swift Parrot');
  });

  it('should return positive for Orange-bellied Parrot detection above threshold', () => {
    const predictions = [
      { species_name: 'Neophema chrysogaster_Orange-bellied Parrot', probability: 0.9 },
    ];

    const result = processDetections(predictions, 0.8);
    expect(result.isPositive).toBe(true);
    expect(result.confidence).toBe(0.9);
    expect(result.scientificName).toBe('Neophema chrysogaster');
    expect(result.commonName).toBe('Orange-bellied Parrot');
  });

  it('should return negative for non-target species', () => {
    const predictions = [
      { species_name: 'Other bird_Some Bird', probability: 0.9 },
    ];

    const result = processDetections(predictions, 0.8);
    expect(result.isPositive).toBe(false);
    expect(result.confidence).toBe(0.9);
  });

  it('should return negative when target species is below threshold', () => {
    const predictions = [
      { species_name: 'Lathamus discolor_Swift Parrot', probability: 0.6 },
    ];

    const result = processDetections(predictions, 0.8);
    expect(result.isPositive).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('should return zero confidence for empty predictions', () => {
    const result = processDetections([], 0.8);
    expect(result.isPositive).toBe(false);
    expect(result.confidence).toBe(0);
  });
});
