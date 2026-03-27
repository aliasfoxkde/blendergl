/**
 * State machine runtime — executes state machines during play mode.
 * Supports built-in states (Idle, Walk, Run, Jump, Fall, Attack) with
 * parameterized transitions and onEnter/onUpdate/onExit callbacks.
 */

import type { StateMachineData, StateMachineState, StateMachineTransition } from "@/editor/types";

interface RuntimeState {
  currentStateId: string;
  timeInState: number;
  parameters: Record<string, number | string | boolean>;
}

class StateMachineRuntime {
  private machines: Map<string, {
    data: StateMachineData;
    runtime: RuntimeState;
    previousStateId: string | null;
  }> = new Map();
  private enabled: boolean = false;

  init(): void {
    this.machines.clear();
    this.enabled = true;
  }

  registerMachine(entityId: string, data: StateMachineData): void {
    this.machines.set(entityId, {
      data,
      runtime: {
        currentStateId: data.initialStateId,
        timeInState: 0,
        parameters: { ...data.parameters },
      },
      previousStateId: null,
    });
  }

  update(dt: number): void {
    if (!this.enabled) return;

    for (const [, machine] of this.machines) {
      const { data, runtime } = machine;

      // Evaluate transitions
      const transitions = data.transitions.filter(
        (t) => t.fromStateId === runtime.currentStateId,
      );

      for (const transition of transitions) {
        if (this.evaluateCondition(transition.condition, runtime.parameters)) {
          this.transitionTo(machine, transition.toStateId);
          break;
        }
      }

      // Run onUpdate of current state
      const state = data.states[runtime.currentStateId];
      if (state?.onUpdate) {
        try {
          new Function("params", "dt", "timeInState", state.onUpdate)(
            runtime.parameters, dt, runtime.timeInState,
          );
        } catch (err) {
          console.warn("State machine onUpdate error:", err);
        }
      }

      runtime.timeInState += dt;
    }
  }

  setParameter(entityId: string, key: string, value: number | string | boolean): void {
    const machine = this.machines.get(entityId);
    if (machine) {
      machine.runtime.parameters[key] = value;
    }
  }

  getParameter(entityId: string, key: string): number | string | boolean | undefined {
    return this.machines.get(entityId)?.runtime.parameters[key];
  }

  getCurrentState(entityId: string): string | null {
    return this.machines.get(entityId)?.runtime.currentStateId ?? null;
  }

  getPreviousState(entityId: string): string | null {
    return this.machines.get(entityId)?.previousStateId ?? null;
  }

  destroy(): void {
    this.machines.clear();
    this.enabled = false;
  }

  private transitionTo(
    machine: { data: StateMachineData; runtime: RuntimeState; previousStateId: string | null },
    newStateId: string,
  ): void {
    const { data, runtime } = machine;

    // Exit current state
    const oldState = data.states[runtime.currentStateId];
    if (oldState?.onExit) {
      try {
        new Function("params", oldState.onExit)(runtime.parameters);
      } catch (err) {
        console.warn("State machine onExit error:", err);
      }
    }

    machine.previousStateId = runtime.currentStateId;
    runtime.currentStateId = newStateId;
    runtime.timeInState = 0;

    // Enter new state
    const newState = data.states[newStateId];
    if (newState?.onEnter) {
      try {
        new Function("params", newState.onEnter)(runtime.parameters);
      } catch (err) {
        console.warn("State machine onEnter error:", err);
      }
    }
  }

  private evaluateCondition(
    condition: string,
    params: Record<string, number | string | boolean>,
  ): boolean {
    try {
      const fn = new Function("params", `"use strict"; return (${condition});`);
      return fn(params) === true;
    } catch {
      return false;
    }
  }

  /**
   * Create a default character state machine with built-in states:
   * Idle, Walk, Run, Jump, Fall, Attack.
   */
  static createCharacterStateMachine(): StateMachineData {
    const states: Record<string, StateMachineState> = {
      idle: {
        id: "idle",
        name: "Idle",
        onEnter: "params.speed = 0;",
        onUpdate: "params.speed = Math.max(0, (params.speed || 0) - 5 * 0.016);",
      },
      walk: {
        id: "walk",
        name: "Walk",
        onEnter: "params.speed = 3;",
        onUpdate: "",
      },
      run: {
        id: "run",
        name: "Run",
        onEnter: "params.speed = 6;",
        onUpdate: "",
      },
      jump: {
        id: "jump",
        name: "Jump",
        onEnter: "params.isGrounded = false;",
        onUpdate: "",
      },
      fall: {
        id: "fall",
        name: "Fall",
        onEnter: "params.isGrounded = false;",
        onUpdate: "",
      },
      attack: {
        id: "attack",
        name: "Attack",
        onEnter: "params.attackTimer = 0.5;",
        onUpdate: "params.attackTimer = Math.max(0, (params.attackTimer || 0) - 0.016);",
        onExit: "params.isAttacking = false;",
      },
    };

    const transitions: StateMachineTransition[] = [
      // Idle → Walk: moving and grounded
      { id: "t1", fromStateId: "idle", toStateId: "walk", condition: "params.isMoving && params.isGrounded && !params.isSprinting" },
      // Idle → Run: moving fast and grounded
      { id: "t2", fromStateId: "idle", toStateId: "run", condition: "params.isMoving && params.isGrounded && params.isSprinting" },
      // Idle → Jump: jump requested and grounded
      { id: "t3", fromStateId: "idle", toStateId: "jump", condition: "params.jumpRequested && params.isGrounded" },
      // Idle → Fall: not grounded
      { id: "t4", fromStateId: "idle", toStateId: "fall", condition: "!params.isGrounded" },
      // Idle → Attack: attack requested
      { id: "t5", fromStateId: "idle", toStateId: "attack", condition: "params.attackRequested" },
      // Walk → Idle: stopped moving
      { id: "t6", fromStateId: "walk", toStateId: "idle", condition: "!params.isMoving && params.isGrounded" },
      // Walk → Run: sprint started
      { id: "t7", fromStateId: "walk", toStateId: "run", condition: "params.isSprinting && params.isGrounded" },
      // Walk → Jump
      { id: "t8", fromStateId: "walk", toStateId: "jump", condition: "params.jumpRequested && params.isGrounded" },
      // Walk → Fall
      { id: "t9", fromStateId: "walk", toStateId: "fall", condition: "!params.isGrounded" },
      // Walk → Attack
      { id: "t10", fromStateId: "walk", toStateId: "attack", condition: "params.attackRequested" },
      // Run → Walk: stopped sprinting
      { id: "t11", fromStateId: "run", toStateId: "walk", condition: "!params.isSprinting && params.isGrounded" },
      // Run → Idle: stopped moving
      { id: "t12", fromStateId: "run", toStateId: "idle", condition: "!params.isMoving && params.isGrounded" },
      // Run → Jump
      { id: "t13", fromStateId: "run", toStateId: "jump", condition: "params.jumpRequested && params.isGrounded" },
      // Run → Fall
      { id: "t14", fromStateId: "run", toStateId: "fall", condition: "!params.isGrounded" },
      // Run → Attack
      { id: "t15", fromStateId: "run", toStateId: "attack", condition: "params.attackRequested" },
      // Jump → Fall: descending
      { id: "t16", fromStateId: "jump", toStateId: "fall", condition: "params.verticalVelocity < 0" },
      // Jump → Idle: landed
      { id: "t17", fromStateId: "jump", toStateId: "idle", condition: "params.isGrounded" },
      // Fall → Idle: landed
      { id: "t18", fromStateId: "fall", toStateId: "idle", condition: "params.isGrounded" },
      // Attack → Idle: attack finished
      { id: "t19", fromStateId: "attack", toStateId: "idle", condition: "(params.attackTimer || 0) <= 0" },
      // Attack → Fall: fell off edge during attack
      { id: "t20", fromStateId: "attack", toStateId: "fall", condition: "!params.isGrounded && (params.attackTimer || 0) > 0" },
    ];

    return {
      id: `character_sm_${Date.now()}`,
      initialStateId: "idle",
      states,
      transitions,
      parameters: {
        speed: 0,
        isMoving: false,
        isSprinting: false,
        isGrounded: true,
        jumpRequested: false,
        attackRequested: false,
        isAttacking: false,
        verticalVelocity: 0,
        attackTimer: 0,
      },
    };
  }
}

// Singleton
export const stateMachineRuntime = new StateMachineRuntime();
