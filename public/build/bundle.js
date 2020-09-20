
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.25.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    /* src/components/Nav.svelte generated by Svelte v3.25.1 */
    const file = "src/components/Nav.svelte";

    // (9:0) {#if isVisible}
    function create_if_block(ctx) {
    	let nav;
    	let span;
    	let img;
    	let img_src_value;
    	let t;
    	let nav_transition;
    	let current;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			span = element("span");
    			img = element("img");
    			t = text("Bullshit Trivia");
    			attr_dev(img, "alt", "taco");
    			if (img.src !== (img_src_value = "./img/cat.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-1evmzcb");
    			add_location(img, file, 10, 25, 260);
    			attr_dev(span, "id", "nav-title");
    			attr_dev(span, "class", "svelte-1evmzcb");
    			add_location(span, file, 10, 4, 239);
    			attr_dev(nav, "class", "svelte-1evmzcb");
    			add_location(nav, file, 9, 2, 189);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, span);
    			append_dev(span, img);
    			append_dev(span, t);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!nav_transition) nav_transition = create_bidirectional_transition(nav, scale, { duration: 2000 }, true);
    				nav_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!nav_transition) nav_transition = create_bidirectional_transition(nav, scale, { duration: 2000 }, false);
    			nav_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (detaching && nav_transition) nav_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(9:0) {#if isVisible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*isVisible*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isVisible*/ ctx[0]) {
    				if (if_block) {
    					if (dirty & /*isVisible*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Nav", slots, []);
    	let isVisible = false;

    	onMount(() => {
    		$$invalidate(0, isVisible = true);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ scale, onMount, isVisible });

    	$$self.$inject_state = $$props => {
    		if ("isVisible" in $$props) $$invalidate(0, isVisible = $$props.isVisible);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [isVisible];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* node_modules/@sveltekit/ui/src/components/Spinner/Spinner.svelte generated by Svelte v3.25.1 */

    const file$1 = "node_modules/@sveltekit/ui/src/components/Spinner/Spinner.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let svg;
    	let circle;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			circle = svg_element("circle");
    			attr_dev(circle, "class", "path svelte-3vwn5l");
    			attr_dev(circle, "cx", "50");
    			attr_dev(circle, "cy", "50");
    			attr_dev(circle, "r", "20");
    			attr_dev(circle, "fill", "none");
    			attr_dev(circle, "stroke", "currentColor");
    			attr_dev(circle, "stroke-width", "5");
    			attr_dev(circle, "stroke-miterlimit", "10");
    			add_location(circle, file$1, 36, 4, 577);
    			attr_dev(svg, "class", "icon svelte-3vwn5l");
    			attr_dev(svg, "viewBox", "25 25 50 50");
    			add_location(svg, file$1, 35, 2, 532);
    			attr_dev(div, "class", "spinner svelte-3vwn5l");
    			add_location(div, file$1, 34, 0, 508);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, circle);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Spinner", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Spinner> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Spinner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Spinner",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/components/WaitingSpinner.svelte generated by Svelte v3.25.1 */
    const file$2 = "src/components/WaitingSpinner.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let spinner;
    	let current;
    	spinner = new Spinner({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(spinner.$$.fragment);
    			attr_dev(div, "class", "spinner-container svelte-wxothd");
    			add_location(div, file$2, 3, 0, 74);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(spinner, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(spinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(spinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(spinner);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("WaitingSpinner", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<WaitingSpinner> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Spinner });
    	return [];
    }

    class WaitingSpinner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WaitingSpinner",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/Joke.svelte generated by Svelte v3.25.1 */
    const file$3 = "src/components/Joke.svelte";

    // (24:2) {:catch error}
    function create_catch_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Oops, Error occured... I'm not that funny";
    			add_location(span, file$3, 24, 4, 1223);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(24:2) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (21:2) {:then data}
    function create_then_block(ctx) {
    	let div0;
    	let t0_value = /*data*/ ctx[2].setup + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2_value = /*data*/ ctx[2].punchline + "";
    	let t2;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			attr_dev(div0, "class", "joke-setup svelte-1jvmanv");
    			add_location(div0, file$3, 21, 4, 1104);
    			attr_dev(div1, "class", "joke-punchline svelte-1jvmanv");
    			add_location(div1, file$3, 22, 4, 1151);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(21:2) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (18:20)      <WaitingSpinner />     <span>Waiting for a funny joke...</span>   {:then data}
    function create_pending_block(ctx) {
    	let waitingspinner;
    	let t0;
    	let span;
    	let current;
    	waitingspinner = new WaitingSpinner({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(waitingspinner.$$.fragment);
    			t0 = space();
    			span = element("span");
    			span.textContent = "Waiting for a funny joke...";
    			add_location(span, file$3, 19, 4, 1044);
    		},
    		m: function mount(target, anchor) {
    			mount_component(waitingspinner, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, span, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(waitingspinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(waitingspinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(waitingspinner, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(18:20)      <WaitingSpinner />     <span>Waiting for a funny joke...</span>   {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let promise;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 2,
    		error: 3,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*fetchJoke*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			info.block.c();
    			attr_dev(div, "class", "joke-container svelte-1jvmanv");
    			add_location(div, file$3, 16, 0, 967);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[2] = child_ctx[3] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Joke", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	const fetchJoke = (() => __awaiter(void 0, void 0, void 0, function* () {
    		const response = yield fetch("https://official-joke-api.appspot.com/jokes/random");
    		return yield response.json();
    	}))();

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Joke> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ __awaiter, WaitingSpinner, fetchJoke });

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fetchJoke];
    }

    class Joke extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Joke",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Section.svelte generated by Svelte v3.25.1 */

    const file$4 = "src/components/Section.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let span;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			img = element("img");
    			t0 = space();
    			t1 = text(/*title*/ ctx[0]);
    			attr_dev(img, "alt", "");
    			if (img.src !== (img_src_value = /*imgpath*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-zfy10i");
    			add_location(img, file$4, 4, 37, 104);
    			attr_dev(span, "class", "svelte-zfy10i");
    			add_location(span, file$4, 4, 31, 98);
    			attr_dev(div, "class", "section-container svelte-zfy10i");
    			add_location(div, file$4, 4, 0, 67);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, img);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imgpath*/ 2 && img.src !== (img_src_value = /*imgpath*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*title*/ 1) set_data_dev(t1, /*title*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Section", slots, []);
    	let { title } = $$props;
    	let { imgpath } = $$props;
    	const writable_props = ["title", "imgpath"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Section> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("imgpath" in $$props) $$invalidate(1, imgpath = $$props.imgpath);
    	};

    	$$self.$capture_state = () => ({ title, imgpath });

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("imgpath" in $$props) $$invalidate(1, imgpath = $$props.imgpath);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, imgpath];
    }

    class Section extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { title: 0, imgpath: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Section",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*title*/ ctx[0] === undefined && !("title" in props)) {
    			console.warn("<Section> was created without expected prop 'title'");
    		}

    		if (/*imgpath*/ ctx[1] === undefined && !("imgpath" in props)) {
    			console.warn("<Section> was created without expected prop 'imgpath'");
    		}
    	}

    	get title() {
    		throw new Error("<Section>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Section>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imgpath() {
    		throw new Error("<Section>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imgpath(value) {
    		throw new Error("<Section>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Buzz.svelte generated by Svelte v3.25.1 */
    const file$5 = "src/components/Buzz.svelte";

    // (25:2) {:catch error}
    function create_catch_block$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Oops, Error occured... I don't know any buzzword at all...";
    			add_location(span, file$5, 25, 4, 1332);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$1.name,
    		type: "catch",
    		source: "(25:2) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (23:2) {:then data}
    function create_then_block$1(ctx) {
    	let div;
    	let span;
    	let t0;
    	let t1_value = /*data*/ ctx[2].phrase + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text("\"");
    			t1 = text(t1_value);
    			t2 = text("\"");
    			attr_dev(span, "class", "buzz-phrase svelte-1x9hawv");
    			add_location(span, file$5, 23, 39, 1256);
    			attr_dev(div, "class", "buzz-phrase-container");
    			add_location(div, file$5, 23, 4, 1221);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$1.name,
    		type: "then",
    		source: "(23:2) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (20:24)      <WaitingSpinner />     <span>Waiting for a fucking Bullshit...</span>   {:then data}
    function create_pending_block$1(ctx) {
    	let waitingspinner;
    	let t0;
    	let span;
    	let current;
    	waitingspinner = new WaitingSpinner({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(waitingspinner.$$.fragment);
    			t0 = space();
    			span = element("span");
    			span.textContent = "Waiting for a fucking Bullshit...";
    			add_location(span, file$5, 21, 4, 1155);
    		},
    		m: function mount(target, anchor) {
    			mount_component(waitingspinner, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, span, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(waitingspinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(waitingspinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(waitingspinner, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$1.name,
    		type: "pending",
    		source: "(20:24)      <WaitingSpinner />     <span>Waiting for a fucking Bullshit...</span>   {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let section;
    	let t;
    	let div;
    	let promise;
    	let current;

    	section = new Section({
    			props: {
    				title: "Bullshit Buzzword",
    				imgpath: "./img/Buzz.png"
    			},
    			$$inline: true
    		});

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block$1,
    		then: create_then_block$1,
    		catch: create_catch_block$1,
    		value: 2,
    		error: 3,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*fetchBuzzword*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			create_component(section.$$.fragment);
    			t = space();
    			div = element("div");
    			info.block.c();
    			attr_dev(div, "class", "buzz-container svelte-1x9hawv");
    			add_location(div, file$5, 18, 0, 1074);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(section, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[2] = child_ctx[3] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(section.$$.fragment, local);
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(section.$$.fragment, local);

    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(section, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Buzz", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	const fetchBuzzword = (() => __awaiter(void 0, void 0, void 0, function* () {
    		const response = yield fetch("https://corporatebs-generator.sameerkumar.website/");
    		return yield response.json();
    	}))();

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Buzz> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		__awaiter,
    		Section,
    		WaitingSpinner,
    		fetchBuzzword
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fetchBuzzword];
    }

    class Buzz extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Buzz",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Trivia.svelte generated by Svelte v3.25.1 */
    const file$6 = "src/components/Trivia.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i].category;
    	child_ctx[8] = list[i].type;
    	child_ctx[9] = list[i].difficulty;
    	child_ctx[10] = list[i].question;
    	child_ctx[11] = list[i].correct_answer;
    	child_ctx[12] = list[i].incorrect_answer;
    	child_ctx[14] = i;
    	return child_ctx;
    }

    // (60:2) {:catch error}
    function create_catch_block$2(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Oops, Error occured... There's no trivia at all";
    			add_location(span, file$6, 60, 4, 2771);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$2.name,
    		type: "catch",
    		source: "(60:2) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (36:2) {:then data}
    function create_then_block$2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*data*/ ctx[6];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*fetchTrivia, isAnswer, clickHandler, isShowBtn*/ 15) {
    				each_value = /*data*/ ctx[6];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$2.name,
    		type: "then",
    		source: "(36:2) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (47:40) 
    function create_if_block_4(ctx) {
    	let div;
    	let t0_value = /*difficulty*/ ctx[9] + "";
    	let t0;
    	let t1;
    	let span;
    	let t2;
    	let t3_value = /*category*/ ctx[7] + "";
    	let t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			t2 = text("- ");
    			t3 = text(t3_value);
    			attr_dev(span, "class", "trivia-category svelte-xykwmt");
    			add_location(span, file$6, 47, 59, 2297);
    			attr_dev(div, "class", "trivia-difficulty hard svelte-xykwmt");
    			add_location(div, file$6, 47, 10, 2248);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(47:40) ",
    		ctx
    	});

    	return block;
    }

    // (45:42) 
    function create_if_block_3(ctx) {
    	let div;
    	let t0_value = /*difficulty*/ ctx[9] + "";
    	let t0;
    	let t1;
    	let span;
    	let t2;
    	let t3_value = /*category*/ ctx[7] + "";
    	let t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			t2 = text("- ");
    			t3 = text(t3_value);
    			attr_dev(span, "class", "trivia-category svelte-xykwmt");
    			add_location(span, file$6, 45, 61, 2140);
    			attr_dev(div, "class", "trivia-difficulty medium svelte-xykwmt");
    			add_location(div, file$6, 45, 10, 2089);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(45:42) ",
    		ctx
    	});

    	return block;
    }

    // (43:8) {#if difficulty === 'easy'}
    function create_if_block_2(ctx) {
    	let div;
    	let t0_value = /*difficulty*/ ctx[9] + "";
    	let t0;
    	let t1;
    	let span;
    	let t2;
    	let t3_value = /*category*/ ctx[7] + "";
    	let t3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			t2 = text("- ");
    			t3 = text(t3_value);
    			attr_dev(span, "class", "trivia-category svelte-xykwmt");
    			add_location(span, file$6, 43, 59, 1979);
    			attr_dev(div, "class", "trivia-difficulty easy svelte-xykwmt");
    			add_location(div, file$6, 43, 10, 1930);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(43:8) {#if difficulty === 'easy'}",
    		ctx
    	});

    	return block;
    }

    // (50:8) {#if isShowBtn[i]}
    function create_if_block_1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[4](/*i*/ ctx[14], ...args);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Check the answer";
    			attr_dev(button, "class", "trivia-checkbtn svelte-xykwmt");
    			add_location(button, file$6, 50, 10, 2405);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(50:8) {#if isShowBtn[i]}",
    		ctx
    	});

    	return block;
    }

    // (53:8) {#if isAnswer[i]}
    function create_if_block$1(ctx) {
    	let div;
    	let t_value = /*correct_answer*/ ctx[11].replace(/&quot;/gi, "\"").replace(/&#039;/gi, "'") + "";
    	let t;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "trivia-answer svelte-xykwmt");
    			add_location(div, file$6, 53, 10, 2548);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, scale, { duration: 500 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, scale, { duration: 500 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(53:8) {#if isAnswer[i]}",
    		ctx
    	});

    	return block;
    }

    // (37:4) {#each data as { category, type, difficulty, question, correct_answer, incorrect_answer }
    function create_each_block(ctx) {
    	let div1;
    	let div0;
    	let span1;
    	let t0_value = /*question*/ ctx[10].replace(/&quot;/gi, "\"").replace(/&#039;/gi, "'") + "";
    	let t0;
    	let t1;
    	let span0;
    	let t2;
    	let t3_value = /*type*/ ctx[8] + "";
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let current;

    	function select_block_type(ctx, dirty) {
    		if (/*difficulty*/ ctx[9] === "easy") return create_if_block_2;
    		if (/*difficulty*/ ctx[9] === "medium") return create_if_block_3;
    		if (/*difficulty*/ ctx[9] === "hard") return create_if_block_4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type && current_block_type(ctx);
    	let if_block1 = /*isShowBtn*/ ctx[1][/*i*/ ctx[14]] && create_if_block_1(ctx);
    	let if_block2 = /*isAnswer*/ ctx[0][/*i*/ ctx[14]] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span1 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span0 = element("span");
    			t2 = text("- (");
    			t3 = text(t3_value);
    			t4 = text(")");
    			t5 = space();
    			if (if_block0) if_block0.c();
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
    			if (if_block2) if_block2.c();
    			t8 = space();
    			attr_dev(span0, "class", "trivia-type svelte-xykwmt");
    			add_location(span0, file$6, 40, 12, 1818);
    			attr_dev(span1, "class", "trivia-question svelte-xykwmt");
    			add_location(span1, file$6, 39, 10, 1715);
    			attr_dev(div0, "class", "trivia-question-container");
    			add_location(div0, file$6, 38, 8, 1665);
    			attr_dev(div1, "class", "trivia-card svelte-xykwmt");
    			add_location(div1, file$6, 37, 6, 1631);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span1);
    			append_dev(span1, t0);
    			append_dev(span1, t1);
    			append_dev(span1, span0);
    			append_dev(span0, t2);
    			append_dev(span0, t3);
    			append_dev(span0, t4);
    			append_dev(div1, t5);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t6);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t7);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div1, t8);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (if_block0) if_block0.p(ctx, dirty);

    			if (/*isShowBtn*/ ctx[1][/*i*/ ctx[14]]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div1, t7);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*isAnswer*/ ctx[0][/*i*/ ctx[14]]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*isAnswer*/ 1) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block$1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div1, t8);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);

    			if (if_block0) {
    				if_block0.d();
    			}

    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(37:4) {#each data as { category, type, difficulty, question, correct_answer, incorrect_answer }",
    		ctx
    	});

    	return block;
    }

    // (33:22)      <WaitingSpinner />     <span>Waiting for trivia...</span>   {:then data}
    function create_pending_block$2(ctx) {
    	let waitingspinner;
    	let t0;
    	let span;
    	let current;
    	waitingspinner = new WaitingSpinner({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(waitingspinner.$$.fragment);
    			t0 = space();
    			span = element("span");
    			span.textContent = "Waiting for trivia...";
    			add_location(span, file$6, 34, 4, 1477);
    		},
    		m: function mount(target, anchor) {
    			mount_component(waitingspinner, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, span, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(waitingspinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(waitingspinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(waitingspinner, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$2.name,
    		type: "pending",
    		source: "(33:22)      <WaitingSpinner />     <span>Waiting for trivia...</span>   {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let section;
    	let t;
    	let div;
    	let promise;
    	let current;

    	section = new Section({
    			props: {
    				title: "10 Trivia Quizzes of this session",
    				imgpath: "./img/quiz.png"
    			},
    			$$inline: true
    		});

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block$2,
    		then: create_then_block$2,
    		catch: create_catch_block$2,
    		value: 6,
    		error: 15,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*fetchTrivia*/ ctx[2], info);

    	const block = {
    		c: function create() {
    			create_component(section.$$.fragment);
    			t = space();
    			div = element("div");
    			info.block.c();
    			attr_dev(div, "class", "trivia-container svelte-xykwmt");
    			add_location(div, file$6, 31, 0, 1396);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(section, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[6] = child_ctx[15] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(section.$$.fragment, local);
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(section.$$.fragment, local);

    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(section, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Trivia", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	const fetchTrivia = (() => __awaiter(void 0, void 0, void 0, function* () {
    		const response = yield fetch("https://opentdb.com/api.php?amount=10");
    		const jsonData = yield response.json();
    		const results = jsonData.results;
    		return results;
    	}))();

    	let isAnswer = [];
    	let isShowBtn = [];

    	for (let i = 0; i < 10; i++) {
    		isAnswer.push(false);
    		isShowBtn.push(true);
    	}

    	const clickHandler = id => {
    		$$invalidate(0, isAnswer[id] = true, isAnswer);
    		$$invalidate(1, isShowBtn[id] = false, isShowBtn);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Trivia> was created with unknown prop '${key}'`);
    	});

    	const click_handler = i => clickHandler(i);

    	$$self.$capture_state = () => ({
    		__awaiter,
    		Section,
    		WaitingSpinner,
    		scale,
    		fetchTrivia,
    		isAnswer,
    		isShowBtn,
    		clickHandler
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("isAnswer" in $$props) $$invalidate(0, isAnswer = $$props.isAnswer);
    		if ("isShowBtn" in $$props) $$invalidate(1, isShowBtn = $$props.isShowBtn);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [isAnswer, isShowBtn, fetchTrivia, clickHandler, click_handler];
    }

    class Trivia extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trivia",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/components/Today.svelte generated by Svelte v3.25.1 */
    const file$7 = "src/components/Today.svelte";

    // (29:2) {:catch error}
    function create_catch_block$3(ctx) {
    	let span0;
    	let br;
    	let t1;
    	let span1;
    	let t2;
    	let a;
    	let t4;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			span0.textContent = "Oops, Error occured... Today is not so vital in human history";
    			br = element("br");
    			t1 = space();
    			span1 = element("span");
    			t2 = text("Failed to load because ");
    			a = element("a");
    			a.textContent = "Numbers API";
    			t4 = text(" doesn't support HTTPS connection. I\n      send an email to developer of Numbers API, so please wait.");
    			add_location(span0, file$7, 29, 4, 1460);
    			add_location(br, file$7, 29, 78, 1534);
    			attr_dev(a, "href", "http://numbersapi.com/#42");
    			add_location(a, file$7, 30, 33, 1574);
    			add_location(span1, file$7, 30, 4, 1545);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span1, anchor);
    			append_dev(span1, t2);
    			append_dev(span1, a);
    			append_dev(span1, t4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span0);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$3.name,
    		type: "catch",
    		source: "(29:2) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (26:2) {:then data}
    function create_then_block$3(ctx) {
    	let div0;
    	let t0_value = /*data*/ ctx[5].year + "";
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let div1;
    	let t6_value = /*data*/ ctx[5].text + "";
    	let t6;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = text("/");
    			t2 = text(/*thisMonth*/ ctx[0]);
    			t3 = text("/");
    			t4 = text(/*thisDate*/ ctx[1]);
    			t5 = space();
    			div1 = element("div");
    			t6 = text(t6_value);
    			attr_dev(div0, "class", "trivia-date svelte-8g0fo8");
    			add_location(div0, file$7, 26, 4, 1325);
    			attr_dev(div1, "class", "today-trivia");
    			add_location(div1, file$7, 27, 4, 1395);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$3.name,
    		type: "then",
    		source: "(26:2) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (23:27)      <WaitingSpinner />     <span>Waiting for a funny joke...</span>   {:then data}
    function create_pending_block$3(ctx) {
    	let waitingspinner;
    	let t0;
    	let span;
    	let current;
    	waitingspinner = new WaitingSpinner({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(waitingspinner.$$.fragment);
    			t0 = space();
    			span = element("span");
    			span.textContent = "Waiting for a funny joke...";
    			add_location(span, file$7, 24, 4, 1265);
    		},
    		m: function mount(target, anchor) {
    			mount_component(waitingspinner, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, span, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(waitingspinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(waitingspinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(waitingspinner, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$3.name,
    		type: "pending",
    		source: "(23:27)      <WaitingSpinner />     <span>Waiting for a funny joke...</span>   {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let section;
    	let t;
    	let div;
    	let promise;
    	let current;

    	section = new Section({
    			props: {
    				title: "Trivia about Today",
    				imgpath: "./img/today.png"
    			},
    			$$inline: true
    		});

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block$3,
    		then: create_then_block$3,
    		catch: create_catch_block$3,
    		value: 5,
    		error: 6,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*fetchTodayTrivia*/ ctx[2], info);

    	const block = {
    		c: function create() {
    			create_component(section.$$.fragment);
    			t = space();
    			div = element("div");
    			info.block.c();
    			attr_dev(div, "class", "today-container svelte-8g0fo8");
    			add_location(div, file$7, 21, 0, 1180);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(section, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[5] = child_ctx[6] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(section.$$.fragment, local);
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(section.$$.fragment, local);

    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(section, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Today", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	const today = new Date();
    	const thisMonth = today.getMonth() + 1;
    	const thisDate = today.getDate();

    	const fetchTodayTrivia = (() => __awaiter(void 0, void 0, void 0, function* () {
    		const response = yield fetch(`//numbersapi.com/${thisMonth}/${thisDate}/date?json`);
    		return yield response.json();
    	}))();

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Today> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		__awaiter,
    		Section,
    		WaitingSpinner,
    		today,
    		thisMonth,
    		thisDate,
    		fetchTodayTrivia
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [thisMonth, thisDate, fetchTodayTrivia];
    }

    class Today extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Today",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.25.1 */

    const file$8 = "src/components/Footer.svelte";

    function create_fragment$8(ctx) {
    	let div2;
    	let div0;
    	let a0;
    	let i;
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let a1;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			i = element("i");
    			t0 = text(" Contribute to Bullshit");
    			t1 = space();
    			div1 = element("div");
    			t2 = text("© 2020 ");
    			a1 = element("a");
    			a1.textContent = "Kota Yatagai";
    			attr_dev(i, "class", "fab fa-github");
    			add_location(i, file$8, 2, 59, 107);
    			attr_dev(a0, "href", "https://github.com/kota-yata/Bullshit-Trivia");
    			attr_dev(a0, "class", "svelte-zt0bo0");
    			add_location(a0, file$8, 2, 4, 52);
    			attr_dev(div0, "class", "contribute svelte-zt0bo0");
    			add_location(div0, file$8, 1, 2, 23);
    			attr_dev(a1, "href", "https://www.kota-yata.com");
    			attr_dev(a1, "class", "svelte-zt0bo0");
    			add_location(a1, file$8, 4, 32, 205);
    			attr_dev(div1, "class", "copyright svelte-zt0bo0");
    			add_location(div1, file$8, 4, 2, 175);
    			attr_dev(div2, "class", "footer svelte-zt0bo0");
    			add_location(div2, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, a0);
    			append_dev(a0, i);
    			append_dev(a0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div1, a1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/components/RandomNumber.svelte generated by Svelte v3.25.1 */
    const file$9 = "src/components/RandomNumber.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i].text;
    	child_ctx[5] = list[i].number;
    	child_ctx[6] = list[i].found;
    	child_ctx[7] = list[i].type;
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (33:2) {:catch error}
    function create_catch_block$4(ctx) {
    	let span0;
    	let br;
    	let t1;
    	let span1;
    	let t2;
    	let a;
    	let t4;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			span0.textContent = "Oops, Error occured... I hate math. Fuck math.";
    			br = element("br");
    			t1 = space();
    			span1 = element("span");
    			t2 = text("Failed to load because ");
    			a = element("a");
    			a.textContent = "Numbers API";
    			t4 = text(" doesn't support HTTPS connection. I\n      send an email to developer of Numbers API, so please wait.");
    			add_location(span0, file$9, 33, 4, 1592);
    			add_location(br, file$9, 33, 63, 1651);
    			attr_dev(a, "href", "http://numbersapi.com/#42");
    			add_location(a, file$9, 34, 33, 1691);
    			add_location(span1, file$9, 34, 4, 1662);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span1, anchor);
    			append_dev(span1, t2);
    			append_dev(span1, a);
    			append_dev(span1, t4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span0);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$4.name,
    		type: "catch",
    		source: "(33:2) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (29:2) {:then data}
    function create_then_block$4(ctx) {
    	let each_1_anchor;
    	let each_value = /*data*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*fetchMath*/ 1) {
    				each_value = /*data*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$4.name,
    		type: "then",
    		source: "(29:2) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (30:4) {#each data as { text, number, found, type }
    function create_each_block$1(ctx) {
    	let div;
    	let i_1;
    	let t0;
    	let t1_value = /*text*/ ctx[4].replace(/\^\{th\}/gi, "th") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i_1 = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(i_1, "class", "fas fa-space-shuttle");
    			add_location(i_1, file$9, 30, 31, 1481);
    			attr_dev(div, "class", "math-trivia svelte-rxdnlm");
    			add_location(div, file$9, 30, 6, 1456);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i_1);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(30:4) {#each data as { text, number, found, type }",
    		ctx
    	});

    	return block;
    }

    // (26:20)      <WaitingSpinner />     <span>Waiting for trivia about math...</span>   {:then data}
    function create_pending_block$4(ctx) {
    	let waitingspinner;
    	let t0;
    	let span;
    	let current;
    	waitingspinner = new WaitingSpinner({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(waitingspinner.$$.fragment);
    			t0 = space();
    			span = element("span");
    			span.textContent = "Waiting for trivia about math...";
    			add_location(span, file$9, 27, 4, 1336);
    		},
    		m: function mount(target, anchor) {
    			mount_component(waitingspinner, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, span, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(waitingspinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(waitingspinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(waitingspinner, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$4.name,
    		type: "pending",
    		source: "(26:20)      <WaitingSpinner />     <span>Waiting for trivia about math...</span>   {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let section;
    	let t;
    	let div;
    	let promise;
    	let current;

    	section = new Section({
    			props: {
    				title: "Trivia about Math",
    				imgpath: "./img/rndnum.png"
    			},
    			$$inline: true
    		});

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block$4,
    		then: create_then_block$4,
    		catch: create_catch_block$4,
    		value: 3,
    		error: 10,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*fetchMath*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			create_component(section.$$.fragment);
    			t = space();
    			div = element("div");
    			info.block.c();
    			attr_dev(div, "class", "math-container svelte-rxdnlm");
    			add_location(div, file$9, 24, 0, 1259);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(section, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[3] = child_ctx[10] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(section.$$.fragment, local);
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(section.$$.fragment, local);

    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(section, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("RandomNumber", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

    	const fetchMath = (() => __awaiter(void 0, void 0, void 0, function* () {
    		let resArray = [];

    		for (let i = 0; i < 10; i++) {
    			const response = yield fetch("//numbersapi.com/random/math?json");
    			resArray.push(yield response.json());
    			yield sleep(500);
    		}

    		return resArray;
    	}))();

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<RandomNumber> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		__awaiter,
    		Section,
    		WaitingSpinner,
    		sleep,
    		fetchMath
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fetchMath];
    }

    class RandomNumber extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RandomNumber",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/components/Trump.svelte generated by Svelte v3.25.1 */
    const file$a = "src/components/Trump.svelte";

    // (31:2) {:catch error}
    function create_catch_block$5(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Oops, Error occured... Trump shuts down my server...";
    			add_location(span, file$a, 31, 4, 1572);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$5.name,
    		type: "catch",
    		source: "(31:2) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (23:2) {:then data}
    function create_then_block$5(ctx) {
    	let div;
    	let blockquote;
    	let p;
    	let a;
    	let t1;
    	let a_href_value;
    	let t2;
    	let script;
    	let script_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			blockquote = element("blockquote");
    			p = element("p");
    			p.textContent = "Fuck you";
    			a = element("a");
    			t1 = text("Trump");
    			t2 = space();
    			script = element("script");
    			attr_dev(p, "lang", "en");
    			attr_dev(p, "dir", "ltr");
    			add_location(p, file$a, 25, 8, 1335);
    			attr_dev(a, "href", a_href_value = /*data*/ ctx[2]._embedded.source[0].url);
    			add_location(a, file$a, 25, 43, 1370);
    			attr_dev(blockquote, "class", "twitter-tweet tw-align-center");
    			attr_dev(blockquote, "data-theme", "dark");
    			add_location(blockquote, file$a, 24, 6, 1258);
    			script.async = true;
    			if (script.src !== (script_src_value = "https://platform.twitter.com/widgets.js")) attr_dev(script, "src", script_src_value);
    			attr_dev(script, "charset", "utf-8");
    			add_location(script, file$a, 27, 6, 1447);
    			attr_dev(div, "class", "trump-url");
    			attr_dev(div, "id", "trump_embed");
    			add_location(div, file$a, 23, 4, 1211);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, blockquote);
    			append_dev(blockquote, p);
    			append_dev(blockquote, a);
    			append_dev(a, t1);
    			append_dev(div, t2);
    			append_dev(div, script);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$5.name,
    		type: "then",
    		source: "(23:2) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (20:21)      <WaitingSpinner />     <span>Waiting for a Trump...</span>   {:then data}
    function create_pending_block$5(ctx) {
    	let waitingspinner;
    	let t0;
    	let span;
    	let current;
    	waitingspinner = new WaitingSpinner({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(waitingspinner.$$.fragment);
    			t0 = space();
    			span = element("span");
    			span.textContent = "Waiting for a Trump...";
    			add_location(span, file$a, 21, 4, 1156);
    		},
    		m: function mount(target, anchor) {
    			mount_component(waitingspinner, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, span, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(waitingspinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(waitingspinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(waitingspinner, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$5.name,
    		type: "pending",
    		source: "(20:21)      <WaitingSpinner />     <span>Waiting for a Trump...</span>   {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let section;
    	let t;
    	let div;
    	let promise;
    	let current;

    	section = new Section({
    			props: {
    				title: "The Greatest Bullshit of America",
    				imgpath: "./img/donald.png"
    			},
    			$$inline: true
    		});

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block$5,
    		then: create_then_block$5,
    		catch: create_catch_block$5,
    		value: 2,
    		error: 3,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*fetchTrump*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			create_component(section.$$.fragment);
    			t = space();
    			div = element("div");
    			info.block.c();
    			attr_dev(div, "class", "trump-container svelte-si0vj2");
    			add_location(div, file$a, 18, 0, 1077);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(section, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[2] = child_ctx[3] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(section.$$.fragment, local);
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(section.$$.fragment, local);

    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(section, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Trump", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	const fetchTrump = (() => __awaiter(void 0, void 0, void 0, function* () {
    		const response = yield fetch("https://api.tronalddump.io/random/quote");
    		return yield response.json();
    	}))();

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Trump> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		__awaiter,
    		Section,
    		WaitingSpinner,
    		fetchTrump
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fetchTrump];
    }

    class Trump extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trump",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/routes/Home.svelte generated by Svelte v3.25.1 */
    const file$b = "src/routes/Home.svelte";

    function create_fragment$b(ctx) {
    	let main;
    	let nav;
    	let t0;
    	let joke;
    	let t1;
    	let buzz;
    	let t2;
    	let trump;
    	let t3;
    	let trivia;
    	let t4;
    	let today;
    	let t5;
    	let randomnumber;
    	let t6;
    	let footer;
    	let current;
    	nav = new Nav({ $$inline: true });
    	joke = new Joke({ $$inline: true });
    	buzz = new Buzz({ $$inline: true });
    	trump = new Trump({ $$inline: true });
    	trivia = new Trivia({ $$inline: true });
    	today = new Today({ $$inline: true });
    	randomnumber = new RandomNumber({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(nav.$$.fragment);
    			t0 = space();
    			create_component(joke.$$.fragment);
    			t1 = space();
    			create_component(buzz.$$.fragment);
    			t2 = space();
    			create_component(trump.$$.fragment);
    			t3 = space();
    			create_component(trivia.$$.fragment);
    			t4 = space();
    			create_component(today.$$.fragment);
    			t5 = space();
    			create_component(randomnumber.$$.fragment);
    			t6 = space();
    			create_component(footer.$$.fragment);
    			add_location(main, file$b, 10, 0, 423);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(nav, main, null);
    			append_dev(main, t0);
    			mount_component(joke, main, null);
    			append_dev(main, t1);
    			mount_component(buzz, main, null);
    			append_dev(main, t2);
    			mount_component(trump, main, null);
    			append_dev(main, t3);
    			mount_component(trivia, main, null);
    			append_dev(main, t4);
    			mount_component(today, main, null);
    			append_dev(main, t5);
    			mount_component(randomnumber, main, null);
    			append_dev(main, t6);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			transition_in(joke.$$.fragment, local);
    			transition_in(buzz.$$.fragment, local);
    			transition_in(trump.$$.fragment, local);
    			transition_in(trivia.$$.fragment, local);
    			transition_in(today.$$.fragment, local);
    			transition_in(randomnumber.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			transition_out(joke.$$.fragment, local);
    			transition_out(buzz.$$.fragment, local);
    			transition_out(trump.$$.fragment, local);
    			transition_out(trivia.$$.fragment, local);
    			transition_out(today.$$.fragment, local);
    			transition_out(randomnumber.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(nav);
    			destroy_component(joke);
    			destroy_component(buzz);
    			destroy_component(trump);
    			destroy_component(trivia);
    			destroy_component(today);
    			destroy_component(randomnumber);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Nav,
    		Joke,
    		Buzz,
    		Trivia,
    		Today,
    		Footer,
    		RandomNumber,
    		Trump
    	});

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.25.1 */

    function create_fragment$c(ctx) {
    	let home;
    	let current;
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(home.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Home });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
