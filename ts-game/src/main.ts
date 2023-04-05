const GAME_SIZE = 400

const deathSound = new Audio("death.wav")
const startSound = new Audio("start.wav")

const playSound = (sound: HTMLAudioElement) => {
  sound.currentTime = 0
  sound.play()
}

const handleResize = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
) => {
  canvas.width = GAME_SIZE * devicePixelRatio
  canvas.height = GAME_SIZE * devicePixelRatio
  ctx.resetTransform()
  ctx.scale(devicePixelRatio, devicePixelRatio)
  ctx.font = "20px sans-serif"
}

const setupCanvas = (canvas: HTMLCanvasElement) => {
  canvas.style.width = `${GAME_SIZE}px`
  canvas.style.height = `${GAME_SIZE}px`
  canvas.width = GAME_SIZE * devicePixelRatio
  canvas.height = GAME_SIZE * devicePixelRatio
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
  handleResize(canvas, ctx)
  onresize = () => handleResize(canvas, ctx)
  return ctx
}

const CIRCLE_RADIUS = 10

const drawCircle = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.beginPath()
  ctx.arc(x, y, CIRCLE_RADIUS, 0, 2 * Math.PI)
  ctx.fill()
}

const PLAYER_HEIGHT = GAME_SIZE - CIRCLE_RADIUS * 2

const drawPlayer = (ctx: CanvasRenderingContext2D, x: number) => {
  ctx.fillStyle = "red"
  drawCircle(ctx, x, PLAYER_HEIGHT)
}

const drawEnemy = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = "blue"
  drawCircle(ctx, x, y)
}

type GameState = {
  state: "start" | "playing" | "gameOver"
  playerX: number
  leftHeld: boolean
  rightHeld: boolean
  roundTime: number
  roundY: number
  highScore: number
}

const startGame = (
  canvas: HTMLCanvasElement,
  tick: (
    state: GameState,
    dt: number
  ) => { state: GameState; draw: (ctx: CanvasRenderingContext2D) => void },
  initialState: GameState,
  handleKeyDown: (state: GameState, key: string) => GameState,
  handleKeyUp: (state: GameState, key: string) => GameState
) => {
  const ctx = setupCanvas(canvas)
  let state = initialState
  onkeydown = (e) => (state = handleKeyDown(state, e.key))
  onkeyup = (e) => (state = handleKeyUp(state, e.key))
  let lastRender = performance.now()
  function gameLoop(timestamp: number) {
    const dt = timestamp - lastRender
    lastRender = timestamp
    const update = tick(state, dt)
    update.draw(ctx)
    state = update.state
    window.requestAnimationFrame(gameLoop)
  }
  requestAnimationFrame(gameLoop)
}

const range = (n: number) => [...Array(n).keys()]

const random = (seed: number) =>
  Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000)

const ENEMY_AMOUNT = 40

const ENEMY_DISTANCE = GAME_SIZE / ENEMY_AMOUNT

const enemies = (roundY: number) => {
  const groupOffset = Math.floor(roundY / ENEMY_DISTANCE)
  return range(ENEMY_AMOUNT + 2).map((i) => [
    GAME_SIZE * random(i + groupOffset),
    400 + (roundY % ENEMY_DISTANCE) - ENEMY_DISTANCE * i,
  ])
}

const drawTextLines = (lines: string[], ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "white"
  ctx.textAlign = "center"
  ctx.textAlign = "center"
  lines.forEach((t, i) =>
    ctx.fillText(t, GAME_SIZE / 2, GAME_SIZE / 2 + 40 * (i - 1) - 60)
  )
}

const startTick = (state: GameState, delta: number) => ({
  state,
  draw: (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE)
    ctx.fillStyle = "white"
    drawTextLines([`< and > to move`, `space to start`], ctx)
  },
})

const PLAYER_SPEED = 0.15

const ENEMY_SPEED = PLAYER_SPEED

const TEXT_MARGIN = 5

const calcScore = (roundTime: number) => Math.floor(roundTime / 1000)

const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

const gameOverTick = (state: GameState, delta: number) => ({
  state,
  draw: (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE)
    enemies(state.roundY).forEach(([x, y]) => drawEnemy(ctx, x, y))
    drawPlayer(ctx, state.playerX)
    drawTextLines(
      [
        `game over`,
        `score: ${calcScore(state.roundTime)}`,
        `high score: ${state.highScore}`,
        `space to restart`,
      ],
      ctx
    )
  },
})

const calcMult = (roundTime: number) => 2 - 1 / (1 + roundTime / 50000)

const playingTick = (state: GameState, delta: number) => {
  state.roundTime += delta
  const score = calcScore(state.roundTime)
  state.highScore = Math.max(state.highScore, score)
  const curEnemies = enemies(state.roundY)
  const multiplier = calcMult(state.roundTime)
  state.roundY += delta * ENEMY_SPEED * multiplier
  if (state.leftHeld) state.playerX -= delta * PLAYER_SPEED * multiplier
  if (state.rightHeld) state.playerX += delta * PLAYER_SPEED * multiplier
  state.playerX = Math.max(CIRCLE_RADIUS, state.playerX)
  state.playerX = Math.min(state.playerX, GAME_SIZE - CIRCLE_RADIUS)
  const enemyDistances = curEnemies.map(([x, y]) =>
    distance(x, y, state.playerX, PLAYER_HEIGHT)
  )
  if (enemyDistances.some((d) => d < CIRCLE_RADIUS * 2)) {
    playSound(deathSound)
    return gameOverTick({ ...state, state: "gameOver" }, delta)
  }
  return {
    state,
    draw: (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = "black"
      ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE)
      drawPlayer(ctx, state.playerX)
      curEnemies.forEach(([x, y]) => drawEnemy(ctx, x, y))
      ctx.textAlign = "left"
      ctx.textBaseline = "top"
      ctx.fillStyle = "white"
      ctx.fillText(`${score} pts`, TEXT_MARGIN, TEXT_MARGIN)
      ctx.textAlign = "center"
      ctx.fillText(`${multiplier.toFixed(2)}x`, GAME_SIZE / 2, TEXT_MARGIN)
    },
  }
}

const tick = (state: GameState, delta: number) => {
  if (state.state === "start") return startTick(state, delta)
  if (state.state === "playing") return playingTick(state, delta)
  if (state.state === "gameOver") return gameOverTick(state, delta)
  throw new Error("Unknown state")
}

startGame(
  document.body.appendChild(document.createElement("canvas")),
  tick,
  {
    state: "start",
    playerX: GAME_SIZE / 2,
    leftHeld: false,
    rightHeld: false,
    roundTime: 0,
    roundY: 0,
    highScore: 0,
  },
  (state, key) => {
    const shouldStart =
      ["gameOver", "start"].includes(state.state) && key === " "
    if (shouldStart) {
      playSound(startSound)
      return {
        ...state,
        state: "playing",
        roundTime: 0,
        roundY: 0,
        playerX: GAME_SIZE / 2,
      }
    } else if (key === "ArrowLeft") return { ...state, leftHeld: true }
    else if (key === "ArrowRight") return { ...state, rightHeld: true }
    return state
  },
  (state, key) => {
    if (key === "ArrowLeft") return { ...state, leftHeld: false }
    else if (key === "ArrowRight") return { ...state, rightHeld: false }
    return state
  }
)
