/**
 * UI for an Audio Message
 *
 * ### Importing
 *
 * Not included with the standard build. Import using:
 *
 * ```
 * import '@layerhq/web-xdk/ui/messages/audio/layer-audio-message-view';
 * ```
 *
 * @class Layer.UI.messages.AudioMessageView
 * @mixin Layer.UI.messages.MessageViewMixin
 * @extends Layer.UI.Component
 */
import { registerComponent } from '../../components/component';
import MessageViewMixin from '../message-view-mixin';
import Constants from '../../constants';
import './layer-video-message-model';
import './layer-video-message-large-view';

registerComponent('layer-video-message-view', {
  mixins: [MessageViewMixin],

  style: `
    layer-video-message-view {
      display: flex;
      width: 100%;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
  `,
  template: `
    <div layer-id="playIcon" class="layer-play-button"></div>
  `,
  properties: {

    /**
     * Use a Standard Message Container to render this UI.
     *
     * @property {String} [messageViewContainerTagName=layer-standard-message-view-container]
     */
    messageViewContainerTagName: {
      noGetterFromSetter: true,
      value: 'layer-standard-message-view-container',
    },

    /**
     * Maximum width allowed for a preview image in px.
     *
     * @property {Number} [maxWidth=450]
     */
    maxWidth: {
      value: 450,
    },

    /**
     * Maximum height allowed for a preview image in px.
     *
     * @property {Number} [maxHeight=250]
     */
    maxHeight: {
      value: 250,
    },

    /**
     * Minimum width allowed for a preview image in px.
     *
     * @property {Number} [minWidth=48]
     */
    minWidth: {
      value: 48,
    },

    /**
     * Minimum height allowed for a preview image in px.
     *
     * @property {Number} [minHeight=48]
     */
    minHeight: {
      value: 48,
    },
  },
  methods: {
    onCreate() {
      this.isHeightAllocated = false;
    },

    onAfterCreate() {
      const video = document.createElement('video');
      if (!video.canPlayType(this.model.mimeType)) {
        this.nodes.playIcon.className = 'layer-not-playable-button';
      }
      if (this.model.preview || this.model.previewUrl) {
        this.model.getPreviewUrl(url => (this.style.backgroundImage = 'url(' + url + ')'));
      }
      this._resizeContent();
    },

    _resizeContent() {
      const { width } = this.getAvailableWidthAndNode();
      if (width) {
        // Setup sizes for this node and the parent node
        const sizes = this.getBestDimensions({
          contentWidth: this.model.previewWidth,
          contentHeight: this.model.previewHeight,
          maxHeight: this.maxHeight,
          maxWidth: this.maxWidth,
          minHeight: this.minHeight,
          minWidth: this.minWidth,
        });
        this.style.width = sizes.width + 'px';
        this.style.height = sizes.height + 'px';
        if (sizes.width >= this.minWidth) {
          this.messageViewer.width = sizes.width;
        }

        this.isHeightAllocated = true;
      }
    },

    /**
     * After we have a parent node and some clue as to our width/height, setup the preview display.
     *
     * @method onAttach
     * @private
     */
    onAttach() {
      // resizeContent should already have triggered, but if onAfterCreate was called when the parent
      // was not yet added to the DOM, then it will need to be resolved here.
      if (!this.isHeightAllocated) this._resizeContent();
    },
  },
});
