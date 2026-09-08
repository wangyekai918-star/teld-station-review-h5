/**
 * 表情、标签、输入与照片交互：特来电电站评价 UI Demo，仅供开发参考样式与交互。
 * 重点参考评分、标签、文字、照片预览及动画；后台接口相关实现请勿作为对接依据。
 * 数据字段、上传和提交回调只用于 Demo 演示，实际业务应按项目接口文档实现。
 * 交付定位和 UI 交互重点见 README.md。
 */
(() => {
  'use strict';

  // 一、评分与标签：从左到右对应 1～5 分；标签顺序与产品表格一致。
  const RATINGS = [
    { value: 1, key: 'very-dissatisfied', label: '很不满意', tags: ['经常跳枪', '设备故障', '无法充满', '停车/进出不便', '位置错误/难找'] },
    { value: 2, key: 'dissatisfied', label: '不满意', tags: ['停车费与实际不符', '有车占位', '环境卫生差', '指引不清晰', '设备维护不及时'] },
    { value: 3, key: 'neutral', label: '一般', tags: ['充电慢', '需要排队', '收费规则不清晰'] },
    { value: 4, key: 'satisfied', label: '满意', tags: ['设备维护及时', '收费规则清晰', '停车收费与实际相符', '不用排队', '导航准确', '指引清晰好找'] },
    { value: 5, key: 'very-satisfied', label: '很满意', tags: ['充电顺利', '设备完好', '充电快', '现场管理好', '环境卫生好', '位置便利'] }
  ];
  const MAX_CHARACTERS = 200; // 超出时展示红色计数并拦截提交，不截断正在输入的内容。
  const MAX_PHOTOS = 9; // 批量选图也最多保留 9 张可读取的图片。
  // 统一缓存页面元素，避免事件中重复查询整个文档。
  const $ = (id) => document.getElementById(id);
  const ui = {
    form: $('review-form'), ratings: $('rating-options'), tags: $('review-tags'), text: $('experience'),
    ratingCard: document.querySelector('.rating-card'),
    count: $('character-count'), currentCount: $('current-count'), photos: $('photo-list'),
    addPhoto: $('add-photo'), photoInput: $('photo-input'), photoStatus: $('photo-status'),
    submit: $('submit-review'), toast: $('toast')
  };
  const state = {
    rating: null, // null 表示未评分：五个表情全部亮色，但没有默认选中值。
    tags: new Set(), // 仅保存当前满意度下的标签，与自由输入文字相互独立。
    photos: [], // 按顺序保存 { id, file, url }；url 是本地预览用的 Blob URL。
    adding: false, // 图片解码期间锁定继续添加和提交，避免数量竞争。
    submitting: false, // 等待接口返回期间防止重复提交。
    submitted: false // 正式成功后锁定；演示提交仍可继续操作。
  };
  // Demo 提交回调占位，不是实际业务接口或原生 Bridge 协议的定义。
  const options = { onSubmit: null };
  // 按可见字符计数，组合 emoji 通常计为一个字；旧 WebView 降级为 Unicode 码点。
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }) : null;
  const countCharacters = (text) => segmenter ? Array.from(segmenter.segment(text)).length : Array.from(text).length;
  const demoSetting = new URLSearchParams(location.search).get('demo');
  // 本地双击默认演示；demo=1 显式演示，demo=0 关闭本地自动演示。
  // 后续调用 init 注入的 APP 回调始终优先于演示回调。
  const useDemoByDefault = demoSetting === '1' || (location.protocol === 'file:' && demoSetting !== '0');
  const demoSubmit = async () => ({ success: true, demo: true });
  let toastTimer; // 后一次提示重新计时。
  let photoSequence = 0; // 照片独立标识，删除时不依赖会变化的展示序号。
  let compositionActive = false; // 中文输入法候选尚未确认时暂不计数或提交。
  let photoEpoch = 0; // 重置后递增，使重置前未完成的异步选图失效。
  let emojiAnimation = null;
  let cardHeightAnimation = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // 二、表情回弹：只缩放 40px 图标容器，不缩放文字或改变布局占位。
  function bounceEmoji(image) {
    // 快速切换时取消上一个表情的回弹，避免多个灰色表情同时跳动。
    emojiAnimation?.cancel();
    emojiAnimation = null;
    if (reducedMotion.matches || typeof image.animate !== 'function') return;
    // 520ms：原尺寸 → 放大 28% → 回缩 6% → 小幅回弹 6% → 原尺寸。
    emojiAnimation = image.animate([
      { transform: 'scale(1)', offset: 0, easing: 'cubic-bezier(.2, .8, .3, 1)' },
      { transform: 'scale(1.28)', offset: .28, easing: 'cubic-bezier(.4, 0, .2, 1)' },
      { transform: 'scale(.94)', offset: .53, easing: 'cubic-bezier(.4, 0, .2, 1)' },
      { transform: 'scale(1.06)', offset: .75, easing: 'cubic-bezier(.4, 0, .2, 1)' },
      { transform: 'scale(1)', offset: 1 }
    ], { duration: 520, easing: 'linear' });
  }

  // 三、统一反馈：Toast 居中显示 2.2 秒，不阻挡后续点击。
  function showToast(message) {
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.hidden = false;
    toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 2200);
  }

  // 提供可选的数据变化通知；这里只派发本地事件，不向网络发送数据。
  function emitChange() {
    window.dispatchEvent(new CustomEvent('station-review:change', { detail: getValue() }));
  }

  // 通过 is-muted 控制亮色层的 200ms 淡出，切换时不替换图片地址。
  function renderRatings() {
    for (const rating of RATINGS) {
      const selected = state.rating === rating.value;
      const active = state.rating === null || selected;
      const label = ui.ratings.querySelector(`[data-rating="${rating.value}"]`);
      label.classList.toggle('is-muted', !active);
      label.querySelector('input').checked = selected;
    }
  }

  // 四、标签与卡片高度；首次初始化和重置默认不播放高度动画。
  function renderTags(animate = false) {
    // 先读取可见高度，再取消旧动画，让快速切换从当前位置继续。
    const previousHeight = ui.ratingCard.getBoundingClientRect().height;
    cardHeightAnimation?.cancel();
    cardHeightAnimation = null;
    const rating = RATINGS.find((item) => item.value === state.rating);
    ui.tags.replaceChildren(); // 每组标签重新创建，默认均未选中。
    ui.tags.hidden = !rating;
    if (!rating) return;
    for (const tag of rating.tags) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'review-tag';
      button.textContent = tag;
      button.setAttribute('aria-pressed', 'false');
      // 点击可多选，再次点击取消；标签操作不修改文本框内容。
      button.addEventListener('click', () => {
        if (state.submitting || state.submitted) return;
        if (state.tags.has(tag)) state.tags.delete(tag);
        else state.tags.add(tag);
        button.setAttribute('aria-pressed', String(state.tags.has(tag)));
        emitChange();
      });
      ui.tags.append(button);
    }
    // 标签渲染后测量自然高度，200ms 内按实际行数伸缩，结束后恢复内容自适应。
    const nextHeight = ui.ratingCard.getBoundingClientRect().height;
    if (animate && !reducedMotion.matches && typeof ui.ratingCard.animate === 'function' && Math.abs(nextHeight - previousHeight) > .5) {
      cardHeightAnimation = ui.ratingCard.animate([
        { height: `${previousHeight}px` },
        { height: `${nextHeight}px` }
      ], { duration: 200, easing: 'cubic-bezier(.4, 0, .2, 1)' });
    }
  }

  // 五、文字计数：0～200 字隐藏，201 字起显示红色当前数量。
  function updateCount() {
    const count = countCharacters(ui.text.value);
    ui.count.hidden = count <= MAX_CHARACTERS;
    ui.currentCount.textContent = String(count);
    ui.text.setAttribute('aria-invalid', String(count > MAX_CHARACTERS));
    return count;
  }

  /**
   * 读取 Demo 内部状态：评分、评分名称、已选标签、用户原文及照片。
   * 该结构只用于交互演示，不作为后台接口字段或图片上传方案的依据。
   */
  function getValue() {
    const rating = RATINGS.find((item) => item.value === state.rating);
    return {
      rating: state.rating,
      ratingLabel: rating?.label ?? '',
      tags: rating ? rating.tags.filter((tag) => state.tags.has(tag)) : [],
      content: ui.text.value,
      photos: state.photos.map(({ file }) => file)
    };
  }

  // 只有表情必填；文字可以为空，但填写后不得超过 200 字。
  function validate() {
    if (state.rating === null) return { valid: false, field: 'rating', message: '请先选择你的评价' };
    if (countCharacters(ui.text.value) > MAX_CHARACTERS) return { valid: false, field: 'content', message: '评价最多200字，请删减后提交' };
    return { valid: true };
  }

  // 集中更新提交按钮、编辑权限和忙碌状态，确保成功/失败后的界面状态一致。
  function updateControls() {
    const locked = state.submitting || state.submitted;
    ui.submit.disabled = locked || state.adding;
    ui.submit.textContent = state.submitting ? '提交中…' : state.submitted ? '已提交' : '提交评价';
    ui.text.readOnly = locked;
    ui.addPhoto.disabled = locked || state.adding;
    ui.form.setAttribute('aria-busy', String(state.submitting || state.adding));
    ui.form.querySelectorAll('.rating-input, .review-tag, .remove-photo').forEach((element) => { element.disabled = locked; });
  }

  // 六、照片列表：缩略图始终插入添加入口之前，按选择顺序单行排列。
  function renderPhotos(scrollToEnd = false) {
    ui.photos.querySelectorAll('.uploaded-photo').forEach((element) => element.remove());
    state.photos.forEach((photo, index) => {
      const tile = document.createElement('div');
      tile.className = 'photo-tile uploaded-photo';
      const thumbnail = document.createElement('img');
      thumbnail.className = 'photo-thumbnail';
      thumbnail.src = photo.url;
      thumbnail.alt = `已添加的第${index + 1}张照片`;
      thumbnail.width = thumbnail.height = 70;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-photo';
      remove.setAttribute('aria-label', `删除第${index + 1}张照片`);
      const icon = document.createElement('img');
      icon.src = './images/icon-remove-photo.png';
      icon.alt = '';
      icon.width = icon.height = 16;
      remove.append(icon);
      remove.addEventListener('click', () => {
        if (state.submitting || state.submitted || state.adding) return;
        const position = state.photos.findIndex((item) => item.id === photo.id);
        if (position < 0) return;
        URL.revokeObjectURL(photo.url); // 删除照片时释放预览地址占用的资源。
        state.photos.splice(position, 1);
        renderPhotos();
        // 删除后将焦点移到邻近照片或添加入口，避免键盘焦点丢失。
        const remainingButtons = ui.photos.querySelectorAll('.remove-photo');
        (remainingButtons[Math.min(position, remainingButtons.length - 1)] || ui.addPhoto).focus({ preventScroll: true });
        emitChange();
      });
      tile.append(thumbnail, remove);
      ui.photos.insertBefore(tile, ui.addPhoto);
    });
    ui.addPhoto.hidden = state.photos.length >= MAX_PHOTOS; // 满 9 张隐藏，删除后恢复。
    ui.addPhoto.setAttribute('aria-label', `添加照片，还可添加${MAX_PHOTOS - state.photos.length}张`);
    ui.photoStatus.textContent = `已添加${state.photos.length}张照片，最多9张`;
    // 等新缩略图参与布局后滚到末尾，露出新照片和剩余添加入口。
    if (scrollToEnd) requestAnimationFrame(() => { ui.photos.scrollLeft = ui.photos.scrollWidth; });
    updateControls();
  }

  // 实际解码判断图片是否可用，15 秒超时避免异常文件一直阻塞。
  function canReadImage(url) {
    return new Promise((resolve) => {
      const image = new Image();
      const timer = setTimeout(() => finish(false), 15000);
      function finish(readable) {
        clearTimeout(timer);
        image.onload = image.onerror = null;
        resolve(readable);
      }
      image.onload = () => finish(image.naturalWidth > 0);
      image.onerror = () => finish(false);
      image.src = url;
    });
  }

  /** 追加 File/Blob 列表，返回实际添加数量；支持系统选图及 APP 适配后的结果。 */
  async function addPhotos(files) {
    if (state.adding || state.submitting || state.submitted) return 0;
    const currentEpoch = photoEpoch;
    let added = 0;
    let invalid = false;
    let overflow = false;
    state.adding = true;
    updateControls();
    try {
      // 顺序读取保证顺序稳定；超出剩余名额时停止，不额外限制图片尺寸。
      for (const file of Array.from(files)) {
        if (photoEpoch !== currentEpoch) break;
        if (state.photos.length >= MAX_PHOTOS) { overflow = true; break; }
        if (!(file instanceof Blob) || (file.type && !file.type.startsWith('image/'))) { invalid = true; continue; }
        const url = URL.createObjectURL(file);
        const readable = await canReadImage(url);
        if (!readable || photoEpoch !== currentEpoch) {
          // 解码失败或表单已重置，都不把该图片加入当前页面。
          URL.revokeObjectURL(url);
          if (!readable) invalid = true;
          continue;
        }
        state.photos.push({ id: ++photoSequence, file, url });
        added++;
      }
    } finally {
      if (photoEpoch === currentEpoch) {
        state.adding = false;
        renderPhotos(added > 0);
        emitChange();
      }
    }
    if (photoEpoch !== currentEpoch) return 0;
    if (overflow) showToast('最多添加9张照片');
    else if (invalid) showToast('部分照片无法读取，请更换后重试');
    return added;
  }

  // 七、提交状态演示：以下回调与返回值判断均为 Demo 占位，不代表实际后台约定。
  async function submit() {
    if (state.submitting || state.submitted || compositionActive) return false;
    const result = validate();
    updateCount();
    if (!result.valid) { showToast(result.message); return false; }
    if (state.adding) { showToast('照片处理中，请稍候'); return false; }
    if (typeof options.onSubmit !== 'function') {
      // 正式模式未配置接口时保留表单并发出通知，不能伪造成功。
      showToast('暂时无法提交，请稍后再试');
      window.dispatchEvent(new CustomEvent('station-review:unconfigured'));
      return false;
    }
    ui.text.blur();
    const isDemo = options.onSubmit === demoSubmit; // 以实际回调判断，避免覆盖真实 APP 的结果。
    state.submitting = true;
    updateControls();
    try {
      const value = getValue();
      const response = await options.onSubmit(value);
      if (response === false || response?.success === false) throw new Error('Submission rejected');
      state.submitted = !isDemo;
      showToast(isDemo ? '演示提交成功' : '提交成功，感谢你的评价');
      window.dispatchEvent(new CustomEvent('station-review:submitted', { detail: { value, response, demo: isDemo } }));
      return true;
    } catch {
      // 失败只提示，不清空评分、标签、文字或照片，方便重试。
      showToast('提交失败，请稍后重试');
      return false;
    } finally {
      state.submitting = false;
      updateControls();
    }
  }

  // 八、重置：清空数据、取消动画、释放图片资源，并使未结束的选图任务失效。
  function reset() {
    if (state.submitting) return false;
    photoEpoch++;
    state.photos.forEach(({ url }) => URL.revokeObjectURL(url));
    state.rating = null;
    state.tags.clear();
    state.photos = [];
    state.adding = state.submitted = false;
    ui.text.value = ui.photoInput.value = '';
    clearTimeout(toastTimer);
    ui.toast.hidden = true;
    emojiAnimation?.cancel();
    emojiAnimation = null;
    renderRatings();
    renderTags();
    renderPhotos();
    updateCount();
    emitChange();
    return true;
  }

  /**
   * Demo 配置：onSubmit 为演示用回调占位，不是正式业务接口定义。
   * safeAreaBottom 为底部安全区像素值。
   * 原生已留安全区时传 0；传 null 恢复系统 env(safe-area-inset-bottom)。
   */
  function init(config = {}) {
    if ('onSubmit' in config) options.onSubmit = config.onSubmit;
    if ('safeAreaBottom' in config) {
      if (config.safeAreaBottom === null) document.documentElement.style.removeProperty('--safe-bottom');
      else if (Number.isFinite(config.safeAreaBottom) && config.safeAreaBottom >= 0) {
        document.documentElement.style.setProperty('--safe-bottom', `${config.safeAreaBottom}px`);
      }
    }
    return window.StationReviewH5;
  }

  // 九、构建五个原生单选项，保留键盘和无障碍选择能力。
  for (const rating of RATINGS) {
    const label = document.createElement('label');
    label.className = 'rating-option';
    label.dataset.rating = rating.value;
    const radio = document.createElement('input');
    radio.className = 'rating-input';
    radio.type = 'radio';
    radio.name = 'rating';
    radio.value = rating.value;
    radio.setAttribute('aria-label', rating.label);
    const content = document.createElement('span');
    content.className = 'rating-content';
    const image = document.createElement('span');
    image.className = 'rating-emoji';
    image.setAttribute('aria-hidden', 'true');
    // 灰色原图常驻底层，亮色原图在上层改变透明度，过渡中不会整张变透明。
    for (const variant of ['inactive', 'active']) {
      const layer = document.createElement('img');
      layer.className = `rating-emoji-layer rating-emoji-${variant}`;
      layer.src = `./images/emoji-${rating.key}-${variant}.png`;
      layer.alt = '';
      layer.width = layer.height = 40;
      layer.draggable = false;
      image.append(layer);
    }
    const text = document.createElement('span');
    text.className = 'rating-label';
    text.textContent = rating.label;
    content.append(image, text);
    label.append(radio, content);
    ui.ratings.append(label);
    // 更换满意度：清空旧标签、切换颜色、更新标签高度并播放回弹。
    radio.addEventListener('change', () => {
      if (state.submitting || state.submitted || state.rating === rating.value) return;
      state.rating = rating.value;
      state.tags.clear();
      renderRatings();
      renderTags(true);
      bounceEmoji(image);
      emitChange();
    });
    // 再次点击已选表情只重播回弹，不清空已选标签。
    radio.addEventListener('click', () => {
      if (!state.submitting && !state.submitted && state.rating === rating.value) bounceEmoji(image);
    });
  }

  // 十、输入事件：输入法候选确认后再计数，避免组词过程中提前提示超限。
  ui.text.addEventListener('compositionstart', () => { compositionActive = true; });
  ui.text.addEventListener('compositionend', () => { compositionActive = false; updateCount(); emitChange(); });
  ui.text.addEventListener('input', () => { if (!compositionActive) { updateCount(); emitChange(); } });
  // 打开选择器前清空旧值，保证重新选择同一文件也能触发 change。
  ui.addPhoto.addEventListener('click', () => { ui.photoInput.value = ''; ui.photoInput.click(); });
  ui.photoInput.addEventListener('change', async () => { const files = Array.from(ui.photoInput.files); ui.photoInput.value = ''; await addPhotos(files); });
  ui.form.addEventListener('submit', (event) => { event.preventDefault(); submit(); }); // 阻止原生提交刷新页面。

  // 十一、软键盘适配：键盘覆盖视口时上移固定底栏，避免挡住输入区域。
  function updateViewport() {
    const viewport = window.visualViewport;
    const inset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    const keyboardOpen = document.activeElement === ui.text && inset > 100;
    document.body.classList.toggle('keyboard-open', keyboardOpen);
    document.documentElement.style.setProperty('--keyboard-inset', `${keyboardOpen ? inset : 0}px`);
  }
  window.visualViewport?.addEventListener('resize', updateViewport);
  window.visualViewport?.addEventListener('scroll', updateViewport);
  ui.text.addEventListener('focus', updateViewport);
  ui.text.addEventListener('blur', updateViewport);

  // 十二、公开接口与首次渲染；内部状态不暴露，也不写入持久化存储。
  window.StationReviewH5 = Object.freeze({ init, getValue, validate, submit, reset, addPhotos });
  if (useDemoByDefault) options.onSubmit = demoSubmit;
  renderRatings();
  renderTags();
  renderPhotos();
  updateCount();
  window.dispatchEvent(new CustomEvent('station-review:ready')); // APP 可在此事件后调用 init。
})();
