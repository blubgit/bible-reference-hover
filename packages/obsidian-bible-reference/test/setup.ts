import { mock } from 'bun:test'

class FakeElement {
  public isConnected = false
  public disabled = false
  public value = ''
  public readonly children: FakeElement[] = []

  public addClass(): void {}
  public setAttr(): void {}
  public setText(): void {}
  public appendText(): void {}
  public focus(): void {}
  public empty(): void {
    this.children.length = 0
  }
  public createDiv(): FakeElement {
    const child = new FakeElement()
    this.children.push(child)
    return child
  }
  public createSpan(): FakeElement {
    return this.createDiv()
  }
  public createEl(_tag: string, options?: { value?: string }): FakeElement {
    const child = this.createDiv()
    child.value = options?.value ?? ''
    return child
  }
  public detach(): void {
    this.isConnected = false
  }
}

class Component {
  public load(): void {}
  public unload(): void {
    this.onunload()
  }
  public onunload(): void {}
  public registerDomEvent(): void {}
}

class HoverPopover extends Component {
  public readonly hoverEl = new FakeElement()
  public hidden = false

  public constructor(
    private readonly parent: { hoverPopover: HoverPopover | null },
    _targetEl: unknown,
    waitTime = 300
  ) {
    super()
    setTimeout(() => this.show(), waitTime)
  }

  public hide(): void {
    this.hidden = true
    this.hoverEl.detach()
    if (this.parent.hoverPopover === this) this.parent.hoverPopover = null
    this.unload()
  }

  private show(): void {
    this.parent.hoverPopover?.hide()
    this.parent.hoverPopover = this
    this.hoverEl.isConnected = !this.hidden
    this.load()
  }
}

// The `obsidian` package is a types-only dependency with no runtime entry point,
// so importing any plugin module that pulls in `obsidian` fails under `bun test`.
// bun's `mock.module` is not hoisted the way `jest.mock` was, so register the
// mock here in a preload (see bunfig.toml) — before any test imports resolve.
mock.module('obsidian', () => ({
  Notice: mock(),
  Component,
  HoverPopover,
  // The suggesters extend these at runtime, so a bare stub is enough to let a
  // test instantiate one and drive it directly. MarkdownView is a value, not
  // just a type, in VerseLookupSuggestModal - without it that module cannot be
  // imported at all under `bun test`.
  MarkdownView: class {},
  EditorSuggest: class {
    app: unknown
    constructor(app: unknown) {
      this.app = app
    }
  },
  SuggestModal: class {
    app: unknown
    constructor(app: unknown) {
      this.app = app
    }
    setInstructions() {}
    onOpen() {}
  },
}))
