/* global Resizer: true */

/**
 * @fileoverview
 * @author Igor Alexeenko (o0)
 */

'use strict';

(function() {
  /** @enum {string} */
  var FileType = {
    'GIF': '',
    'JPEG': '',
    'PNG': '',
    'SVG+XML': ''
  };

  /** @enum {number} */
  var Action = {
    ERROR: 0,
    UPLOADING: 1,
    CUSTOM: 2
  };

  /**
   * Начало отсчета даты хранения куки
   * @const {string}
  */
  var BIRTH_DAY = '1985-04-08';

  /**
   * Регулярное выражение, проверяющее тип загружаемого файла. Составляется
   * из ключей FileType.
   * @type {RegExp}
   */
  var fileRegExp = new RegExp('^image/(' + Object.keys(FileType).join('|').replace('\+', '\\+') + ')$', 'i');

  /**
   * @type {Object.<string, string>}
   */
  var filterMap;

  /**
   * Объект, который занимается кадрированием изображения.
   * @type {Resizer}
   */
  var currentResizer;

  /**
   * Объект, занимающий работой с кукис из библиотеки browser-cookies
   * @type {browser-cookies}
   */
  var browserCookies = require('browser-cookies');

  /**
   * Приведение даты к типу {Date} и поиск даты последнего ДР
   * @return {Date}
   */
  function normalizeStartDate(date) {
    date = new Date(date);
    if (!isNaN(date)) {
      date.setFullYear(new Date(Date.now()).getFullYear());
      if (date > Date.now()) {
        date.setFullYear(date.getFullYear() - 1);
      }
    }
    return date;
  }

  /**
   * Расчет периода хранения куки
   * @return {Number}
   */
  function daysToExpire(startDate) {
    if (!isNaN(startDate)) {
      return Math.floor((Date.now() - startDate) / (24 * 60 * 60 * 1000));
    }
    return 0;
  }

  /**
   * Удаляет текущий объект {@link Resizer}, чтобы создать новый с другим
   * изображением.
   */
  function cleanupResizer() {
    if (currentResizer) {
      currentResizer.remove();
      currentResizer = null;
    }
  }

  /**
   * Ставит одну из трех случайных картинок на фон формы загрузки.
   */
  function updateBackground() {
    var images = [
      'img/logo-background-1.jpg',
      'img/logo-background-2.jpg',
      'img/logo-background-3.jpg'
    ];

    var backgroundElement = document.querySelector('.upload');
    var randomImageNumber = Math.round(Math.random() * (images.length - 1));
    backgroundElement.style.backgroundImage = 'url(' + images[randomImageNumber] + ')';
  }

  /**
   * Проверяет, валидны ли данные, в форме кадрирования.
   * @return {boolean}
   */
  function resizeFormIsValid() {
    return ((Number(resizeCtrls.x.value) + Number(resizeCtrls.size.value) <= currentResizer._image.naturalWidth) &&
      (Number(resizeCtrls.y.value) + Number(resizeCtrls.size.value) <= currentResizer._image.naturalHeight) &&
      (Math.min(resizeCtrls.x.value, resizeCtrls.y.value, resizeCtrls.size.value) >= 0));
  }

  /**
   * Устанавливает ограничения для элементов управления.
   */
  function setResizeFormConrolsLimits() {
    resizeCtrls.x.min = 0;
    resizeCtrls.y.min = 0;
    resizeCtrls.size.min = 0;
    resizeCtrls.x.max = currentResizer._image.naturalWidth - +resizeCtrls.size.value;
    resizeCtrls.y.max = currentResizer._image.naturalHeight - +resizeCtrls.size.value;
    resizeCtrls.size.max = Math.min(currentResizer._image.naturalWidth - +resizeCtrls.x.value, currentResizer._image.naturalHeight - +resizeCtrls.y.value);
  }

  /**
   * Форма загрузки изображения.
   * @type {HTMLFormElement}
   */
  var uploadForm = document.forms['upload-select-image'];

  /**
   * Форма кадрирования изображения.
   * @type {HTMLFormElement}
   */
  var resizeForm = document.forms['upload-resize'];

  /**
   * Элементы управления размерами изображения.
   * @type {Object.<string, number>}
   */
  var resizeCtrls = {
    x: resizeForm.querySelector('#resize-x'),
    y: resizeForm.querySelector('#resize-y'),
    size: resizeForm.querySelector('#resize-size')
  };


  /**
   * Форма добавления фильтра.
   * @type {HTMLFormElement}
   */
  var filterForm = document.forms['upload-filter'];

  /**
   * @type {HTMLImageElement}
   */
  var filterImage = filterForm.querySelector('.filter-image-preview');

  /**
   * @type {HTMLElement}
   */
  var uploadMessage = document.querySelector('.upload-message');

  /**
   * @param {Action} action
   * @param {string=} message
   * @return {Element}
   */
  function showMessage(action, message) {
    var isError = false;

    switch (action) {
      case Action.UPLOADING:
        message = message || 'Кексограмим&hellip;';
        break;

      case Action.ERROR:
        isError = true;
        message = message || 'Неподдерживаемый формат файла<br> <a href="' + document.location + '">Попробовать еще раз</a>.';
        break;
    }

    uploadMessage.querySelector('.upload-message-container').innerHTML = message;
    uploadMessage.classList.remove('invisible');
    uploadMessage.classList.toggle('upload-message-error', isError);
    return uploadMessage;
  }

  function hideMessage() {
    uploadMessage.classList.add('invisible');
  }

  /**
   * Обработчик изменения изображения в форме загрузки. Если загруженный
   * файл является изображением, считывается исходник картинки, создается
   * Resizer с загруженной картинкой, добавляется в форму кадрирования
   * и показывается форма кадрирования.
   * @param {Event} evt
   */
  uploadForm.onchange = function(evt) {
    var element = evt.target;
    if (element.id === 'upload-file') {
      // Проверка типа загружаемого файла, тип должен быть изображением
      // одного из форматов: JPEG, PNG, GIF или SVG.
      if (fileRegExp.test(element.files[0].type)) {
        var fileReader = new FileReader();

        showMessage(Action.UPLOADING);

        fileReader.onload = function() {
          cleanupResizer();

          currentResizer = new Resizer(fileReader.result);
          currentResizer.setElement(resizeForm);
          currentResizer._image.addEventListener('load', setResizeFormConrolsLimits);
          uploadMessage.classList.add('invisible');

          uploadForm.classList.add('invisible');
          resizeForm.classList.remove('invisible');

          hideMessage();
        };

        fileReader.readAsDataURL(element.files[0]);
      } else {
        // Показ сообщения об ошибке, если загружаемый файл, не является
        // поддерживаемым изображением.
        showMessage(Action.ERROR);
      }
    }
  };

  /**
   * Обработчик ввода данных в форму кадрирования. Проводится валидация вводимых значений,
   * и в случае ввода неверных значений, отправка формы отключается.
   * @param {Event} evt
   */
  resizeForm.oninput = function(evt) {
    //debugger;
    var element = evt.target;
    // console.log(element);
    if (element.id === 'resize-x' || 'resize-y' || 'resize-size') {
      var resizeFwd = resizeForm.querySelector('#resize-fwd');
      // Проверка, валиден ли ввод в поле
      if (!element.validity.valid) {
        // Показ сообщения об ошибке и отключение отправки
        // если поле не валидно.
        showMessage(Action.ERROR, element.validationMessage);
        setTimeout(hideMessage, 2000);
        resizeFwd.disabled = true;
        // Окончание проверки, если даже ввод в поле не валиден
        return;
      }
      // Если сами по себе поля валидны, выполняетя проверка валидности всей формы
      if (!resizeFormIsValid()) {
        // Показ сообщения об ошибке и отключение отправки
        // если форма не прошла валидацию.
        showMessage(Action.ERROR, 'Суммы "Сторона" и "Слева", "Сверху" должны быть меньше ' + currentResizer._image.naturalWidth + 'px и ' + currentResizer._image.naturalHeight + 'px соответственно!');
        setTimeout(hideMessage, 2500);
        resizeFwd.disabled = true;
      } else {
        resizeFwd.disabled = false;
      }
    }
  };

  /**
   * Обработка сброса формы кадрирования. Возвращает в начальное состояние
   * и обновляет фон.
   * @param {Event} evt
   */
  resizeForm.onreset = function(evt) {
    evt.preventDefault();

    cleanupResizer();
    updateBackground();

    resizeForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  };

  /**
   * Обработка отправки формы кадрирования. Если форма валидна, экспортирует
   * кропнутое изображение в форму добавления фильтра и показывает ее.
   * @param {Event} evt
   */
  resizeForm.onsubmit = function(evt) {
    evt.preventDefault();

    if (resizeFormIsValid()) {
      filterImage.src = currentResizer.exportImage().src;

      resizeForm.classList.add('invisible');
      filterForm.classList.remove('invisible');
      filterForm['upload-filter-' + browserCookies.get('filter') || 'none'].checked = true;
      filterForm.onchange();
    }
  };

  /**
   * Сброс формы фильтра. Показывает форму кадрирования.
   * @param {Event} evt
   */
  filterForm.onreset = function(evt) {
    evt.preventDefault();

    filterForm.classList.add('invisible');
    resizeForm.classList.remove('invisible');
  };

  /**
   * Отправка формы фильтра. Возвращает в начальное состояние, предварительно
   * записав сохраненный фильтр в cookie.
   * @param {Event} evt
   */
  filterForm.onsubmit = function(evt) {
    evt.preventDefault();

    browserCookies.set('filter', filterForm['upload-filter'].value, {expires: daysToExpire(normalizeStartDate(BIRTH_DAY))});
    cleanupResizer();
    updateBackground();

    filterForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  };

  /**
   * Обработчик изменения фильтра. Добавляет класс из filterMap соответствующий
   * выбранному значению в форме.
   */
  filterForm.onchange = function() {
    if (!filterMap) {
      // Ленивая инициализация. Объект не создается до тех пор, пока
      // не понадобится прочитать его в первый раз, а после этого запоминается
      // навсегда.
      filterMap = {
        'none': 'filter-none',
        'chrome': 'filter-chrome',
        'sepia': 'filter-sepia'
      };
    }

    var selectedFilter = [].filter.call(filterForm['upload-filter'], function(item) {
      return item.checked;
    })[0].value;

    // Класс перезаписывается, а не обновляется через classList потому что нужно
    // убрать предыдущий примененный класс. Для этого нужно или запоминать его
    // состояние или просто перезаписывать.
    filterImage.className = 'filter-image-preview ' + filterMap[selectedFilter];
  };

  cleanupResizer();
  updateBackground();
})();
