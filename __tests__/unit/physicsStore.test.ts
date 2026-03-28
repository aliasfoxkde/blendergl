import { describe, it, expect, beforeEach } from "vitest";
import { usePhysicsStore } from "@/editor/stores/physicsStore";

describe("Physics Store", () => {
  beforeEach(() => {
    usePhysicsStore.getState().resetAll();
  });

  it("starts with empty state", () => {
    const state = usePhysicsStore.getState();
    expect(state.bodies).toEqual({});
    expect(state.scripts).toEqual({});
    expect(state.stateMachines).toEqual({});
    expect(state.playMode).toBe("stopped");
    expect(state.playTime).toBe(0);
  });

  it("adds and retrieves a body", () => {
    const { setBody } = usePhysicsStore.getState();
    setBody("entity1", { mass: 5, friction: 0.7 });

    const body = usePhysicsStore.getState().bodies["entity1"];
    expect(body).toBeDefined();
    expect(body!.mass).toBe(5);
    expect(body!.friction).toBe(0.7);
    expect(body!.enabled).toBe(false); // defaults to false
  });

  it("enables a body", () => {
    const { setBody, enableBody, disableBody } = usePhysicsStore.getState();
    setBody("entity1", {});
    disableBody("entity1");
    expect(usePhysicsStore.getState().bodies["entity1"]!.enabled).toBe(false);

    enableBody("entity1");
    expect(usePhysicsStore.getState().bodies["entity1"]!.enabled).toBe(true);
  });

  it("creates a body if it does not exist on enable", () => {
    const { enableBody } = usePhysicsStore.getState();
    enableBody("newEntity");

    const body = usePhysicsStore.getState().bodies["newEntity"];
    expect(body).toBeDefined();
    expect(body!.enabled).toBe(true);
  });

  it("removes a body", () => {
    const { setBody, removeBody } = usePhysicsStore.getState();
    setBody("entity1", {});
    removeBody("entity1");

    expect(usePhysicsStore.getState().bodies["entity1"]).toBeUndefined();
  });

  it("sets body properties (mass, friction, restitution, collider)", () => {
    const { setBody } = usePhysicsStore.getState();
    setBody("entity1", {
      mass: 10,
      friction: 0.3,
      restitution: 0.8,
      colliderShape: "sphere",
      motionType: "static",
      linearDamping: 0.5,
      angularDamping: 0.5,
      isTrigger: true,
      collisionLayer: 5,
      collisionMask: 3,
    });

    const body = usePhysicsStore.getState().bodies["entity1"];
    expect(body!.mass).toBe(10);
    expect(body!.friction).toBe(0.3);
    expect(body!.restitution).toBe(0.8);
    expect(body!.colliderShape).toBe("sphere");
    expect(body!.motionType).toBe("static");
    expect(body!.linearDamping).toBe(0.5);
    expect(body!.angularDamping).toBe(0.5);
    expect(body!.isTrigger).toBe(true);
    expect(body!.collisionLayer).toBe(5);
    expect(body!.collisionMask).toBe(3);
  });

  it("manages game scripts", () => {
    const { addScript, removeScript, updateScript } = usePhysicsStore.getState();

    addScript("entity1", {
      id: "s1",
      name: "Test Script",
      source: "function onUpdate(dt) {}",
      enabled: true,
    });

    const scripts = usePhysicsStore.getState().scripts["entity1"];
    expect(scripts).toHaveLength(1);
    expect(scripts![0].name).toBe("Test Script");

    updateScript("entity1", "s1", { name: "Updated Script" });
    expect(usePhysicsStore.getState().scripts["entity1"]![0].name).toBe("Updated Script");

    removeScript("entity1", "s1");
    expect(usePhysicsStore.getState().scripts["entity1"]).toHaveLength(0);
  });

  it("manages state machines", () => {
    const { addStateMachine, removeStateMachine, updateStateMachine } = usePhysicsStore.getState();

    addStateMachine("entity1", {
      id: "sm1",
      name: "Idle/Walk/Run",
      initialState: "idle",
      parameters: {},
      states: [],
      transitions: [],
    });

    const sms = usePhysicsStore.getState().stateMachines["entity1"];
    expect(sms).toHaveLength(1);

    updateStateMachine("entity1", "sm1", { initialState: "walk" });
    expect(usePhysicsStore.getState().stateMachines["entity1"]![0].initialState).toBe("walk");

    removeStateMachine("entity1", "sm1");
    expect(usePhysicsStore.getState().stateMachines["entity1"]).toHaveLength(0);
  });

  it("sets game settings", () => {
    const { setGameSettings, setGravity } = usePhysicsStore.getState();

    setGameSettings({ fixedTimeStep: 0.01 });
    expect(usePhysicsStore.getState().gameSettings.fixedTimeStep).toBe(0.01);

    setGravity({ x: 0, y: -20, z: 0 });
    expect(usePhysicsStore.getState().gameSettings.gravity).toEqual({ x: 0, y: -20, z: 0 });
  });

  it("manages play mode", () => {
    const { startPlay, pausePlay, resumePlay, stopPlay, tickPlay } = usePhysicsStore.getState();

    startPlay();
    expect(usePhysicsStore.getState().playMode).toBe("playing");
    expect(usePhysicsStore.getState().playTime).toBe(0);

    tickPlay(0.1);
    expect(usePhysicsStore.getState().playTime).toBe(0.1);

    pausePlay();
    expect(usePhysicsStore.getState().playMode).toBe("paused");

    resumePlay();
    expect(usePhysicsStore.getState().playMode).toBe("playing");

    stopPlay();
    expect(usePhysicsStore.getState().playMode).toBe("stopped");
    expect(usePhysicsStore.getState().playTime).toBe(0);
  });

  it("debug wireframes toggle", () => {
    const { setShowDebugWireframes } = usePhysicsStore.getState();

    expect(usePhysicsStore.getState().showDebugWireframes).toBe(false);

    setShowDebugWireframes(true);
    expect(usePhysicsStore.getState().showDebugWireframes).toBe(true);

    setShowDebugWireframes(false);
    expect(usePhysicsStore.getState().showDebugWireframes).toBe(false);
  });

  it("resetAll clears everything", () => {
    const { setBody, addScript, addStateMachine, startPlay, resetAll } = usePhysicsStore.getState();

    setBody("e1", { mass: 5 });
    addScript("e1", { id: "s1", name: "S", source: "", enabled: true });
    addStateMachine("e1", { id: "sm1", name: "SM", initialState: "idle", parameters: {}, states: [], transitions: [] });
    startPlay();

    resetAll();

    const state = usePhysicsStore.getState();
    expect(state.bodies).toEqual({});
    expect(state.scripts).toEqual({});
    expect(state.stateMachines).toEqual({});
    expect(state.playMode).toBe("stopped");
    expect(state.playTime).toBe(0);
  });
});
