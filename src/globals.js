// Global state for the application
export let model = null;
export let globalScene = null;
export let globalCamera = null;
export let globalControls = null;

export const setModel = (m) => { model = m; };
export const setGlobalScene = (s) => { globalScene = s; };
export const setGlobalCamera = (c) => { globalCamera = c; };
export const setGlobalControls = (c) => { globalControls = c; };

export const getModel = () => model;
export const getGlobalScene = () => globalScene;
export const getGlobalCamera = () => globalCamera;
export const getGlobalControls = () => globalControls;
