local GAME_SIZE = 400
local CIRCLE_RADIUS = GAME_SIZE / 40
local PLAYER_Y = GAME_SIZE - CIRCLE_RADIUS * 2
local ENEMY_AMOUNT = 40
local ENEMY_DISTANCE = GAME_SIZE / ENEMY_AMOUNT
local BASE_SPEED = .15
local SIZES = { 400, 600, 800 }
local START_SOUND = love.audio.newSource("start.wav", "static")
local DEATH_SOUND = love.audio.newSource("death.wav", "static")

local sizeIndex = 0


function Random(seed)
  return math.sin(seed) * 10000 - math.floor(math.sin(seed) * 10000)
end

function Enemies(roundY)
  local ENEMY_OFFSET = math.floor(roundY / ENEMY_DISTANCE)
  local ENEMIES_TO_SHOW = ENEMY_AMOUNT + (CIRCLE_RADIUS / ENEMY_DISTANCE) + 1
  local ENEMIES_TO_SKIP = ENEMY_OFFSET < ENEMIES_TO_SHOW and ENEMIES_TO_SHOW - ENEMY_OFFSET or 0
  local enemies = {}
  for i = 1 + ENEMIES_TO_SKIP, ENEMY_AMOUNT + (CIRCLE_RADIUS / ENEMY_DISTANCE) + 1 do
    enemies[i - ENEMIES_TO_SKIP] = {
      x = GAME_SIZE * Random(i + ENEMY_OFFSET),
      y = 400 - ENEMY_DISTANCE * (i - 1) + roundY % ENEMY_DISTANCE,
    }
  end
  return enemies
end

function CalcMult(roundTime)
  return 2 - 1 / (1 + roundTime / 50000)
end

local GAME_STATES = { "start", "playing", "gameOver" }

local state = {
  playerX = 400,
  phase = GAME_STATES[1],
  leftPressed = false,
  rightPressed = false,
  roundY = 0,
  roundTime = 0,
  highScore = 0
}

function DrawCenteredText(text, x, y)
  local font = love.graphics.getFont()
  local textWidth = font:getWidth(text)
  local textHeight = font:getHeight()
  love.graphics.print(text, x - textWidth / 2, y - textHeight / 2)
end

function DrawHorizontallyCenteredText(text, x, y)
  local font = love.graphics.getFont()
  local textWidth = font:getWidth(text)
  love.graphics.print(text, x - textWidth / 2, y)
end

function DrawEnemiesAndPlayer()
  local enemies = Enemies(state.roundY)
  love.graphics.setColor(0, 0, 1)
  for i = 1, #enemies do
    love.graphics.circle("fill", enemies[i].x, enemies[i].y, CIRCLE_RADIUS)
  end
  love.graphics.setColor(1, 0, 0)
  love.graphics.circle("fill", state.playerX, PLAYER_Y, CIRCLE_RADIUS)
  love.graphics.setColor(1, 1, 1)
end

function love.draw()
  local newSize = SIZES[(sizeIndex % #SIZES) + 1]
  love.graphics.scale(newSize / GAME_SIZE)
  if state.phase == GAME_STATES[1] then
    DrawCenteredText("< and > to move", 200, 80)
    DrawCenteredText("space to start", 200, 120)
  elseif state.phase == GAME_STATES[2] then
    DrawEnemiesAndPlayer()
    love.graphics.setColor(1, 1, 1)
    love.graphics.print(math.floor(state.roundTime / 1000) .. " pts", 5, 5)
    local mult = CalcMult(state.roundTime)
    local formattedMult = string.format("%.2f", mult)
    DrawHorizontallyCenteredText("x" .. formattedMult, 200, 5)
  elseif state.phase == GAME_STATES[3] then
    DrawEnemiesAndPlayer()
    DrawCenteredText("game over", 200, 80)
    local score = math.floor(state.roundTime / 1000)
    DrawCenteredText("score: " .. score, 200, 120)
    DrawCenteredText("high score: " .. state.highScore, 200, 160)
    DrawCenteredText("space to restart", 200, 200)
  end
end

function love.update(dt)
  if state.phase == GAME_STATES[1] then
    if love.keyboard.isDown("space") then
      START_SOUND:play()
      state.phase = GAME_STATES[2]
      state.roundTime = 0
      state.roundY = 0
      state.playerX = GAME_SIZE / 2
    end
  elseif state.phase == GAME_STATES[2] then
    state.roundY = state.roundY + dt * 1000 * BASE_SPEED * CalcMult(state.roundTime)
    state.playerX = state.playerX + ((love.keyboard.isDown("left") and -1 or 0) +
        (love.keyboard.isDown("right") and 1 or 0)) * BASE_SPEED * dt * 1000 * CalcMult(state.roundTime)
    state.playerX = math.max(CIRCLE_RADIUS, math.min(GAME_SIZE - CIRCLE_RADIUS, state.playerX))
    state.roundTime = state.roundTime + dt * 1000
    state.highScore = math.max(state.highScore, math.floor(state.roundTime / 1000))
    local enemies = Enemies(state.roundY)
    local isTouchingEnemy = false
    for i = 1, #enemies do
      local dist = math.sqrt((enemies[i].x - state.playerX) ^ 2 + (enemies[i].y - PLAYER_Y) ^ 2)
      if dist < CIRCLE_RADIUS * 2 then
        isTouchingEnemy = true
        break
      end
    end
    if isTouchingEnemy then
      DEATH_SOUND:play()
      state.phase = GAME_STATES[3]
    end
  elseif state.phase == GAME_STATES[3] then
    if love.keyboard.isDown("space") then
      START_SOUND:play()
      state.phase = GAME_STATES[1]
      state.roundY = 0
      state.roundTime = 0
    end
  end
end

function love.keypressed(key)
  if key == "=" then
    sizeIndex = sizeIndex + 1
    local newSize = SIZES[(sizeIndex % #SIZES) + 1]
    love.graphics.replaceTransform(love.math.newTransform())
    love.window.setMode(newSize, newSize, { highdpi = true, msaa = 4 })
  end
end

love.window.setMode(400, 400, { highdpi = true, msaa = 4 })
love.window.setTitle("dodge the rain")
love.graphics.setNewFont(15)
