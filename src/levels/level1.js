const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const addCoinsOnPlatform = (coins, x, y, tiles) => {
  const count = Math.max(1, Math.floor(tiles / 2));
  const step = tiles > 2 ? 48 : 40;
  for (let i = 0; i < count; i += 1) {
    coins.push({ x: x + 32 + i * step, y: y - 96 });
  }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const generateLevel = () => {
  const width = 3200;
  const height = 720;
  const groundY = 656;
  const tileW = 64;
  const maxRise = 200;
  const minRise = 120;
  const ground = [];
  const platforms = [];
  const pathPlatforms = [];
  const coins = [];
  const spikes = [];

  let x = 0;
  let segmentIndex = 0;
  while (x < width) {
    const tiles = randInt(4, 8);
    const segmentWidth = tiles * tileW;
    ground.push({ x, y: groundY, tiles });

    if (segmentIndex % 2 === 1) {
      const spikeCount = Math.random() < 0.6 ? 2 : 1;
      for (let i = 0; i < spikeCount; i += 1) {
        const spikeX = x + randInt(1, tiles - 2) * tileW + 12;
        spikes.push({ x: spikeX, y: groundY });
      }
    }

    const gapTiles = randInt(1, 2);
    x += segmentWidth + gapTiles * tileW;
    segmentIndex += 1;
  }

  // Guaranteed main path: reachable chain from ground to finish.
  let pathX = 260;
  let pathY = groundY - 140;
  while (pathX < width - 220) {
    const platformTiles = randInt(2, 3);
    const platformX = pathX;
    const platformY = clamp(pathY + randInt(-60, 60), groundY - maxRise, groundY - minRise);
    platforms.push({ x: platformX, y: platformY, tiles: platformTiles });
    pathPlatforms.push({ x: platformX, y: platformY, tiles: platformTiles });
    pathX += randInt(200, 260);
    pathY = platformY;
  }

  // Extra random platforms for variety.
  for (let i = 0; i < 6; i += 1) {
    const platformTiles = randInt(2, 3);
    const platformX = randInt(0, width - platformTiles * tileW);
    const platformY = groundY - randInt(140, 260);
    platforms.push({ x: platformX, y: platformY, tiles: platformTiles });
  }

  const hasSpikeInSegment = (segment) => {
    const start = segment.x;
    const end = segment.x + segment.tiles * tileW;
    return spikes.some((spike) => spike.x >= start && spike.x <= end);
  };

  const safeSegments = ground.filter((segment) => !hasSpikeInSegment(segment));
  const pickSegment = (fallbackIndex) => (safeSegments.length > 0 ? safeSegments[fallbackIndex % safeSegments.length] : ground[fallbackIndex % ground.length]);

  const checkpointSegment = pickSegment(Math.floor(ground.length / 2));
  const finishSegment = pickSegment(ground.length - 1);

  const checkpoint = { x: checkpointSegment.x + (checkpointSegment.tiles * tileW) / 2, y: groundY };
  const finish = { x: finishSegment.x + (finishSegment.tiles * tileW) / 2, y: groundY };
  const start = { x: 100, y: 520 };

  const overlapsRect = (coin, rect) => (
    coin.x >= rect.x &&
    coin.x <= rect.x + rect.w &&
    coin.y >= rect.y &&
    coin.y <= rect.y + rect.h
  );

  const platformRects = platforms.map((platform) => ({
    x: platform.x,
    y: platform.y,
    w: platform.tiles * tileW,
    h: 32
  }));
  const groundRects = ground.map((segment) => ({
    x: segment.x,
    y: segment.y,
    w: segment.tiles * tileW,
    h: 64
  }));

const filterCoins = (list) => list.filter((coin) => {
  const inPlatform = platformRects.some((rect) => overlapsRect(coin, rect));
  const inGround = groundRects.some((rect) => overlapsRect(coin, rect));
  return !inPlatform && !inGround;
});
  const uniqueCoins = (list) => {
    const seen = new Set();
    return list.filter((coin) => {
      const key = `${Math.round(coin.x)}|${Math.round(coin.y)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Platform coins: only on the guaranteed path to avoid unreachable coins.
  pathPlatforms.forEach((platform) => {
    addCoinsOnPlatform(coins, platform.x, platform.y, platform.tiles);
  });

  // Ground coins: every other safe segment (no spikes).
  safeSegments.forEach((segment, index) => {
    if (index % 2 === 0) {
      const centerX = segment.x + (segment.tiles * tileW) / 2;
      coins.push({ x: centerX, y: groundY - 140 });
    }
  });

  const hasSupport = (coin) => {
    const surfaces = [...platformRects, ...groundRects];
    return surfaces.some((rect) => {
      if (coin.x < rect.x || coin.x > rect.x + rect.w) {
        return false;
      }
      const gap = rect.y - coin.y;
      return gap >= 60 && gap <= 170;
    });
  };

  const filtered = uniqueCoins(filterCoins(coins.slice())).filter(hasSupport);
  coins.length = 0;
  coins.push(...filtered);

  // Cap required coins to available count.
  // If somehow no coins, add a couple above the start area.
  if (coins.length === 0) {
    coins.push({ x: 200, y: groundY - 140 });
    coins.push({ x: 320, y: groundY - 140 });
  }
  const requiredCoins = Math.min(8, coins.length);

  return {
    width,
    height,
    start,
    checkpoint,
    finish,
    requiredCoins,
    ground,
    platforms,
    coins,
    spikes
  };
};

export default generateLevel;
