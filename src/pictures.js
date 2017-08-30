'use strict';

(function() {
  /**
   * @const
   * @type {Number}
   */
  var IMAGE_LOAD_TIMEOUT = 5000;

  /**
   * Массив данных о плитках для фона
   * @type {Array.<Object>}
   */
  var tiles = [];

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
  var tilesContainer = document.querySelector('.pictures');

  /**
   * Фильтры
   * @type {HTMLElement}
   */
  var filtersElement = document.querySelector('.filters');

  /**
   * Возвращает подготовленный элемент плитки
   * @param {Object} tile
   * @returns {HTMLElement}
   */
  var getTileElement = function(tile) {
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
      tileImage.src = ('preview' in tile) ? tile.preview : tile.url;
    })();

    tileElement.querySelector('.picture-comments').textContent = tile.comments;
    tileElement.querySelector('.picture-likes').textContent = tile.likes;

    return tileElement;
  };

  /**
   * Отрисовывает коллекцию плиток в контейнер
   * @param {Array.<Object>} tilesCollection
   * @param {HTMLElement} container
   */
  var renderTilesCollection = function(tilesCollection, container) {
    // очистка контейнера
    container.innerHTML = '';
    tilesCollection.forEach(function(tile) {
      // Добавление полностью настроенного клонрованного элемента в контейнер
      container.appendChild(getTileElement(tile));
    });
  };

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

  // отрисовка исходных плиток
  tiles = window.pictures;
  renderTilesCollection(tiles, tilesContainer);

  // Показываем фильтры только когда все плитки отрисованы
  filtersElement.classList.remove('hidden');
})();
