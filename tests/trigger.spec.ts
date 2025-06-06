import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import { mount } from '../src'
import { keyCodesByKeyName, KeyName } from '../src/createDomEvent'

describe('trigger', () => {
  describe('on click', () => {
    it('works on the root element', async () => {
      const Component = defineComponent({
        setup() {
          return {
            count: ref(0)
          }
        },

        render() {
          return h(
            'div',
            { onClick: () => this.count++ },
            `Count: ${this.count}`
          )
        }
      })

      const wrapper = mount(Component)
      await wrapper.trigger('click')

      expect(wrapper.text()).toBe('Count: 1')
    })

    it('works on a nested element', async () => {
      const Component = defineComponent({
        setup() {
          return {
            count: ref(0)
          }
        },

        render() {
          return h('div', {}, [
            h('p', {}, `Count: ${this.count}`),
            h('button', { onClick: () => this.count++ })
          ])
        }
      })

      const wrapper = mount(Component)
      await wrapper.find('button').trigger('click')

      expect(wrapper.find('p').text()).toBe('Count: 1')
    })

    it('works with right modifier', async () => {
      const handler = vi.fn()
      const Component = {
        template: '<div @click.right="handler"/>',
        methods: { handler }
      }
      const wrapper = mount(Component)
      await wrapper.trigger('click.right')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].type).toBe('contextmenu')
      expect(handler.mock.calls[0][0].button).toBe(2)
    })

    it('works with middle modifier', async () => {
      const handler = vi.fn()
      const Component = {
        template: '<div @click.middle="handler"/>',
        methods: { handler }
      }
      const wrapper = mount(Component)
      await wrapper.trigger('click.middle')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].button).toBe(1)
      expect(handler.mock.calls[0][0].type).toBe('mouseup')
    })

    it('works with meta and key modifiers', async () => {
      const handler = vi.fn()
      const Component = {
        template: '<div @click.meta.right="handler"/>',
        methods: { handler }
      }
      const wrapper = mount(Component)
      await wrapper.trigger('click.meta.right')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].metaKey).toBe(true)
      expect(handler.mock.calls[0][0].button).toBe(2)
    })

    it('causes DOM to update after a click handler method that changes components data is called', async () => {
      const Component = defineComponent({
        setup() {
          return {
            isActive: ref(false)
          }
        },

        render() {
          return h('div', {
            onClick: () => (this.isActive = !this.isActive),
            class: { active: this.isActive }
          })
        }
      })
      const wrapper = mount(Component, {})

      expect(wrapper.classes()).not.toContain('active')
      await wrapper.trigger('click')
      expect(wrapper.classes()).toContain('active')
    })
  })

  describe('on keydown', () => {
    it('causes keydown handler to fire when "keydown" is triggered', async () => {
      const keydownHandler = vi.fn()
      const Component = {
        template: '<input @keydown="keydownHandler" />',
        methods: { keydownHandler }
      }
      const wrapper = mount(Component, {})

      // is not fired when a diferent event is triggered
      await wrapper.trigger('click')
      expect(keydownHandler).not.toHaveBeenCalled()

      // is called when 'keydown' is triggered
      await wrapper.trigger('keydown')
      expect(keydownHandler).toHaveBeenCalledTimes(1)

      // is called when 'keydown' is triggered with a modificator
      await wrapper.trigger('keydown.enter')
      expect(keydownHandler).toHaveBeenCalledTimes(2)

      // is called when 'keydown' is triggered with an option
      await wrapper.trigger('keydown', { key: 'K' })
      expect(keydownHandler).toHaveBeenCalledTimes(3)
    })

    it('causes keydown handler to fire when "keydown.enter" is triggered', async () => {
      const keydownHandler = vi.fn()
      const Component = {
        template: '<input @keydown.enter="keydownHandler" />',
        methods: { keydownHandler }
      }
      const wrapper = mount(Component)

      // is not called when key is not 'enter'
      await wrapper.trigger('keydown', { key: 'Backspace' })
      expect(keydownHandler).not.toHaveBeenCalled()

      // is not called when key is uppercase 'ENTER'
      await wrapper.trigger('keydown', { key: 'ENTER' })
      expect(keydownHandler).not.toHaveBeenCalled()

      // is not called if passed keyCode instead
      await wrapper.trigger('keydown', { keyCode: 13 })
      expect(keydownHandler).not.toHaveBeenCalled()

      // is called when key is lowercase 'enter'
      await wrapper.trigger('keydown', { key: 'enter' })
      expect(keydownHandler).toHaveBeenCalledTimes(1)
      expect(keydownHandler.mock.calls[0][0].key).toBe('enter')

      // is called when key is titlecase 'Enter'
      await wrapper.trigger('keydown', { key: 'Enter' })
      expect(keydownHandler).toHaveBeenCalledTimes(2)
      expect(keydownHandler.mock.calls[1][0].key).toBe('Enter')

      // is correctly parsed when using modifier
      await wrapper.trigger('keydown.enter')
      expect(keydownHandler).toHaveBeenCalledTimes(3)
      expect(keydownHandler.mock.calls[2][0].key).toBe('enter')
    })

    it('overwrites key if passed as a modifier', async () => {
      const keydownHandler = vi.fn()
      const Component = {
        template: '<input @keydown.enter="keydownHandler" />',
        methods: { keydownHandler }
      }
      const wrapper = mount(Component)

      // is called when key is lowercase 'enter'
      await wrapper.trigger('keydown.enter', { key: 'up' })
      expect(keydownHandler).toHaveBeenCalledTimes(1)
      expect(keydownHandler.mock.calls[0][0].key).toBe('enter')
      expect(keydownHandler.mock.calls[0][0].keyCode).toBe(13)
    })

    it('causes keydown handler to fire with multiple modifiers', async () => {
      const keydownHandler = vi.fn()
      const Component = {
        template: '<input @keydown.ctrl.shift.left="keydownHandler" />',
        methods: { keydownHandler }
      }
      const wrapper = mount(Component)

      await wrapper.trigger('keydown.ctrl.shift.left')

      expect(keydownHandler).toHaveBeenCalledTimes(1)

      const event = keydownHandler.mock.calls[0][0]
      expect(event.key).toBe('left')
      expect(event.shiftKey).toBe(true)
      expect(event.ctrlKey).toBe(true)
      expect(event.ctrlKey).toBe(true)
    })

    it('causes keydown handler to fire with the appropriate keyCode when wrapper.trigger("keydown", { keyCode: 65 }) is fired', async () => {
      const keydownHandler = vi.fn()
      const Component = {
        template: '<input @keydown="keydownHandler" />',
        methods: { keydownHandler }
      }
      const wrapper = mount(Component, {})
      await wrapper.trigger('keydown', { keyCode: 65 })

      expect(keydownHandler).toHaveBeenCalledTimes(1)
      expect(keydownHandler.mock.calls[0][0].keyCode).toBe(65)
    })

    it('causes keydown handler to fire with the appropriate code when wrapper.trigger("keydown", { code: "Space" }) is fired', async () => {
      const keydownHandler = vi.fn()
      const Component = {
        template: '<input @keydown="keydownHandler" />',
        methods: { keydownHandler }
      }
      const wrapper = mount(Component, {})
      await wrapper.trigger('keydown', { code: 'Space', key: ' ', keyCode: 32 })

      expect(keydownHandler).toHaveBeenCalledTimes(1)
      expect(keydownHandler.mock.calls[0][0].key).toBe(' ')
      expect(keydownHandler.mock.calls[0][0].code).toBe('Space')
      expect(keydownHandler.mock.calls[0][0].keyCode).toBe(32)
    })

    it('causes keydown handler to fire converting keyName in an appropriate keyCode when wrapper.trigger("keydown.${keyName}") is fired', async () => {
      const keydownHandler = vi.fn()

      const Component = {
        template: '<input @keydown="keydownHandler" />',
        methods: { keydownHandler }
      }
      const wrapper = mount(Component, {})

      for (const keyName in keyCodesByKeyName) {
        const keyCode = keyCodesByKeyName[keyName as KeyName]
        wrapper.trigger(`keydown.${keyName}`)

        const calls = keydownHandler.mock.calls
        const currentCall = calls[calls.length - 1][0]

        expect(currentCall.keyCode).toBe(keyCode)
      }
    })
  })

  describe('on disabled elements', () => {
    it('does not fires when trigger is called on a valid disabled element', async () => {
      const validElementsToBeDisabled = [
        'button',
        'fieldset',
        'optgroup',
        'option',
        'select',
        'textarea',
        'input'
      ]

      for (const element of validElementsToBeDisabled) {
        const clickHandler = vi.fn()
        const Component = {
          template: `<${element} disabled @click="clickHandler" />`,
          methods: { clickHandler }
        }
        const wrapper = mount(Component, {})
        await wrapper.trigger('click')

        expect(clickHandler).not.toHaveBeenCalled()
      }
    })

    it('is fired when trigger is called on a element set as disabled but who is invalid to be disabled', async () => {
      const invalidElementsToBeDisabled = ['div', 'span', 'a']

      for (const element of invalidElementsToBeDisabled) {
        const clickHandler = vi.fn()
        const Component = {
          template: `<${element} disabled @click="clickHandler" />`,
          methods: { clickHandler }
        }
        const wrapper = mount(Component, {})
        await wrapper.trigger('click')

        expect(clickHandler).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('event modifiers', () => {
    const eventModifiers = [
      'stop',
      'prevent',
      'capture',
      'self',
      'once',
      'passive'
    ]
    for (const modifier of eventModifiers) {
      it(`handles .${modifier}`, async () => {
        const keydownHandler = vi.fn()
        const Component = {
          template: `<input @keydown.${modifier}="keydownHandler" />`,
          methods: { keydownHandler }
        }
        const wrapper = mount(Component, {})

        await wrapper.trigger('keydown')

        expect(keydownHandler).toHaveBeenCalledTimes(1)
      })
    }
  })

  describe('custom data', () => {
    it('adds custom data to events', () => {
      const updateHandler = vi.fn()
      const Component = {
        template: '<div @update="updateHandler" />',
        methods: { updateHandler }
      }
      const wrapper = mount(Component, {})

      wrapper.trigger('update', { customData: 123 })
      expect(updateHandler).toHaveBeenCalledTimes(1)
      expect(updateHandler.mock.calls[0][0].customData).toBe(123)
    })
  })

  describe('errors', () => {
    it('throws error if options contains a target value', async () => {
      const expectedErrorMessage =
        '[vue-test-utils]: you cannot set the target value of an event. See the notes section of the docs for more details—https://vue-test-utils.vuejs.org/api/wrapper/trigger.html'

      const clickHandler = vi.fn()
      const Component = {
        template: '<div @click="clickHandler" />',
        methods: { clickHandler }
      }
      const wrapper = mount(Component, {})

      const fn = wrapper.trigger('click', { target: 'something' })
      await expect(fn).rejects.toThrowError(expectedErrorMessage)

      expect(clickHandler).not.toHaveBeenCalled()
    })
  })

  it('dispatches event', async () => {
    const Comp = defineComponent({
      template: `
        <input
          @keyup.enter="$emit('enter')"
          @keyup.esc="$emit('esc')"
          @click="$emit('click')"
        >
      `
    })

    const wrapper = mount(Comp)

    await wrapper.find('input').trigger('keyup.enter')

    expect(wrapper.emitted().enter).toHaveLength(1)
  })

  // https://github.com/vuejs/test-utils/issues/1854
  it('dispatches events even with fakeTimers', async () => {
    const handlerSpy = vi.fn()

    const Component = defineComponent({
      setup() {
        return { handlerSpy }
      },
      template: `
      <div>
        <a @click="handlerSpy">
          <span @click="() => {}">Ok</span>
        </a>
      </div>
      `
    })

    vi.useFakeTimers()
    const wrapper = mount(Component)

    expect(handlerSpy).not.toHaveBeenCalled()

    await wrapper.get('span').trigger('click')

    expect(handlerSpy).toHaveBeenCalled()
  })
})
