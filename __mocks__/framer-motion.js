// Mock framer-motion for tests
const React = require("react");

const motion = {
  div: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("div", { ...props, ref }, children),
  ),
  span: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("span", { ...props, ref }, children),
  ),
  button: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("button", { ...props, ref }, children),
  ),
  a: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("a", { ...props, ref }, children),
  ),
  img: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("img", { ...props, ref }, children),
  ),
  svg: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("svg", { ...props, ref }, children),
  ),
  path: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("path", { ...props, ref }, children),
  ),
  p: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("p", { ...props, ref }, children),
  ),
  h1: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("h1", { ...props, ref }, children),
  ),
  h2: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("h2", { ...props, ref }, children),
  ),
  h3: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("h3", { ...props, ref }, children),
  ),
  ul: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("ul", { ...props, ref }, children),
  ),
  li: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("li", { ...props, ref }, children),
  ),
  section: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("section", { ...props, ref }, children),
  ),
  article: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("article", { ...props, ref }, children),
  ),
  header: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("header", { ...props, ref }, children),
  ),
  footer: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("footer", { ...props, ref }, children),
  ),
  nav: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("nav", { ...props, ref }, children),
  ),
  form: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("form", { ...props, ref }, children),
  ),
  input: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("input", { ...props, ref }, children),
  ),
  textarea: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("textarea", { ...props, ref }, children),
  ),
  label: React.forwardRef(({ children, ...props }, ref) =>
    React.createElement("label", { ...props, ref }, children),
  ),
};

const AnimatePresence = ({ children }) =>
  React.createElement(React.Fragment, null, children);

const useAnimation = () => ({
  start: jest.fn(),
  set: jest.fn(),
  stop: jest.fn(),
  mount: jest.fn(),
});

const useMotionValue = (value) => ({
  get: () => value,
  set: jest.fn(),
  subscribe: jest.fn(),
  destroy: jest.fn(),
  onChange: jest.fn(),
  version: "0",
  attach: jest.fn(),
});

const useTransform = (value, ...args) => value;

const useSpring = (value) => value;

const useScroll = () => ({
  scrollX: { get: () => 0 },
  scrollY: { get: () => 0 },
  scrollXProgress: { get: () => 0 },
  scrollYProgress: { get: () => 0 },
});

const useInView = () => [React.useRef(null), true];

const usePresence = () => [true, jest.fn()];

const useReducedMotion = () => false;

const useDragControls = () => ({
  start: jest.fn(),
  subscribe: jest.fn(),
});

const useAnimate = () => [React.useRef(null), jest.fn()];

const useAnimationControls = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  set: jest.fn(),
  mount: jest.fn(),
  subscribe: jest.fn(),
});

const MotionConfig = ({ children }) => children;

const LazyMotion = ({ children }) => children;

const domAnimation = {};
const domMax = {};

const LayoutGroup = ({ children }) => children;

const AnimateSharedLayout = ({ children }) => children;

const animate = jest.fn();

const stagger = jest.fn((delay) => delay);

const spring = jest.fn(() => ({}));

const inertia = jest.fn(() => ({}));

const keyframes = jest.fn(() => ({}));

const tween = jest.fn(() => ({}));

const cubicBezier = jest.fn(() => ({}));

const circIn = jest.fn();
const circInOut = jest.fn();
const circOut = jest.fn();

const backIn = jest.fn();
const backInOut = jest.fn();
const backOut = jest.fn();

const anticipate = jest.fn();

const bounceIn = jest.fn();
const bounceInOut = jest.fn();
const bounceOut = jest.fn();

const easeIn = jest.fn();
const easeInOut = jest.fn();
const easeOut = jest.fn();

module.exports = {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  useSpring,
  useScroll,
  useInView,
  usePresence,
  useReducedMotion,
  useDragControls,
  useAnimate,
  useAnimationControls,
  MotionConfig,
  LazyMotion,
  domAnimation,
  domMax,
  LayoutGroup,
  AnimateSharedLayout,
  animate,
  stagger,
  spring,
  inertia,
  keyframes,
  tween,
  cubicBezier,
  circIn,
  circInOut,
  circOut,
  backIn,
  backInOut,
  backOut,
  anticipate,
  bounceIn,
  bounceInOut,
  bounceOut,
  easeIn,
  easeInOut,
  easeOut,
};
