'use strict';

(function() {
  /**
   * @const
   * @type {Number}
   */
  var IMAGE_LOAD_TIMEOUT = 5000;

  /**
   * Контейнер шаблонов элементов
   * @type {HTMLElement}
   */
  var tileTemplate;

  /**
   * Шаблон плитки
   * @type {HTMLElement}
   */
  var templateElement = document.querySelector('#picture-template');

  /**
   * Контейнер для плиток
   * @type {HTMLElement}
   */
  var picturesContainer = document.querySelector('.pictures');

  /**
   * Фильтры
   * @type {HTMLElement}
   */
  var filtersElement = document.querySelector('.filters');

  // Проверка, что фильтры спрятаны, иначе прячем
  if (!filtersElement.classList.contains('hidden')) {
    filtersElement.classList.add('hidden');
  }

  // Проверка для старых браузеров, не поддерживающих template
  if ('content' in templateElement) {
    tileTemplate = templateElement.content.querySelector('.picture');
  } else {
    tileTemplate = templateElement.querySelector('.picture');
  }

  window.pictures.forEach(function(picture) {
    /**
     * Клонированный элемент
     * @type {HTMLElement}
     */
    var tileElement = tileTemplate.cloneNode(true);

    /**
     * Загрузка изображения.
     */
    (function() {
      /**
       * Объект изображения для загрузки
       * @type {Image}
       */
      var tileImage = new Image(182, 182);

      /**
       * Таймаут ожидания загрузки
       * @type {Number}
       */
      var loadTimeout;

      // Прячем плитку, чтобы избежать отображения момента их загрузки
      tileElement.classList.add('picture-hidden');

      // Обработка события onload, отключаем таймат загрузки и устанавливаем источник изображения
      tileImage.onload = function() {
        clearTimeout(loadTimeout);
        tileElement.querySelector('img').src = tileImage.src;
        tileElement.classList.remove('picture-hidden');
      };

      // Обработка события onerror, добавляем класс, стилизующий ошибку загрузки
      tileImage.onerror = function() {
        tileElement.classList.add('picture-load-failure');
        tileElement.classList.remove('picture-hidden');
      };

      // Установка таймаута для отмены загрузки изображения
      loadTimeout = setTimeout(function() {
        tileImage.src = '';
        tileElement.classList.add('picture-load-failure');
        tileElement.classList.remove('picture-hidden');
      }, IMAGE_LOAD_TIMEOUT);

      // Установка источника изображения для фото (url) и для видео (preview)
      tileImage.src = ('preview' in picture) ? picture.preview : picture.url;
    })();

    tileElement.querySelector('.picture-comments').textContent = picture.comments;
    tileElement.querySelector('.picture-likes').textContent = picture.likes;

    // Добавление полностью настроенного клонрованного элемента в контейнер
    picturesContainer.appendChild(tileElement);
  });

  // Показываем фильтры только когда все плитки отрисованы
  filtersElement.classList.remove('hidden');
})();
