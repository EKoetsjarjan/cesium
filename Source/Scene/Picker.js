define([
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/Renderbuffer',
        '../Renderer/RenderbufferFormat',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Scene/DerivedCommand',
        '../Scene/PickDepth'
    ], function(
        Cartesian3,
        Cartesian4,
        BoundingRectangle,
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        Framebuffer,
        PassState,
        PixelDatatype,
        Renderbuffer,
        RenderbufferFormat,
        RenderState,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        DerivedCommand,
        PickDepth) {
    'use strict';

    /**
     * @private
     */
    function Picker(scene) {
        this._colorTexture = undefined;
        this._depthStencilTexture = undefined;
        this._depthStencilRenderbuffer = undefined;
        this._framebuffer = undefined;
        this._clearCommand = undefined;
        this._passState = undefined;

        var camera = new Camera(scene);
        camera.frustum = new OrthographicFrustum({
            width: 0.1, // TODO : don't hardcode?
            aspectRatio: 1.0,
            near: 0.1,
            far: 500000000.0 // TODO : don't hardcode?
        });
        this.camera = camera;
    }

    function destroyResources(picker) {
        picker._framebuffer = picker._framebuffer && picker._framebuffer.destroy();
        picker._colorTexture = picker._colorTexture && picker._colorTexture.destroy();
        picker._depthStencilTexture = picker._depthStencilTexture && picker._depthStencilTexture.destroy();
        picker._depthStencilRenderbuffer = picker._depthStencilRenderbuffer && picker._depthStencilRenderbuffer.destroy();
    }

    function createResources(picker, context) {
        var width = 1;
        var height = 1;

        picker._colorTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });

        if (context.depthTexture) {
            picker._depthStencilTexture = new Texture({
                context : context,
                width : width,
                height : height,
                pixelFormat : PixelFormat.DEPTH_STENCIL,
                pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8,
                sampler : new Sampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.NEAREST,
                    magnificationFilter : TextureMagnificationFilter.NEAREST
                })
            });
        } else {
            picker._depthStencilRenderbuffer = new Renderbuffer({
                context : context,
                width : width,
                height : height,
                format : RenderbufferFormat.DEPTH_STENCIL
            });
        }

        picker._framebuffer = new Framebuffer({
            context : context,
            colorTextures : [picker._colorTexture],
            depthStencilTexture : picker._depthStencilTexture,
            depthStencilRenderbuffer : picker._depthStencilRenderbuffer,
            destroyAttachments : false
        });

        picker._passState = new PassState({
            context : context,
            framebuffer : picker._framebuffer,
            viewport : new BoundingRectangle(0, 0, width, height)
        });

        picker._clearCommand = new ClearCommand({
            depth : 1.0,
            color : new Color(),
            owner : this
        });

        picker._pickDepth = new PickDepth();
    }

    Picker.prototype.begin = function(scene, ray, commandStart) {
        var frameState = scene.frameState;
        var context = frameState.context;
        if (!defined(this._framebuffer)) {
            createResources(this, context);
        }

        var camera = picker._camera;
        if (!defined(camera)) {
        }


        // TODO : need to set the orthographic frustum dimensions properly cause its based on distance


        camera.frustum = new OrthographicFrustum();
        camera.frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        camera.frustum.width = camera.positionCartographic.height;
        frameState.


        // TODO : is this enough to initialize a camera

        var passState = this._passState;
        var clearCommand = this._clearCommand;

        clearCommand.execute(context, passState);

        var commandList = frameState.commandList;
        var commandEnd = commandList.length;

        for (var i = commandStart; i < commandEnd; ++i) {
            var command = commandList[i];
            var depthCommand = command.derivedCommands.depth;
            if (!defined(depthCommand) || command.dirty) {
                depthCommand = DerivedCommand.createDepthOnlyDerivedCommand(command, context, depthCommand);
                command.derivedCommands.depth = depthCommand;
                command.dirty = false;
            }
            depthCommand.execute(context, passState);
        }

        commandList.length = commandStart;
    };

    var scratchPackedDepth = new Cartesian4();
    var packedDepthScale = new Cartesian4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0);

    Picker.prototype.end = function(frameState, result) {
        var width = 1.0;
        var height = 1.0;
        var context = frameState.context;

        var pickDepth = this._pickDepth;
        pickDepth.update(context, this._depthStencilTexture);
        pickDepth.executeCopyDepth(context, this._passState);

        var pixels = context.readPixels({
            x : 0,
            y : 0,
            width : width,
            height : height,
            framebuffer : pickDepth.framebuffer
        });

        var packedDepth = Cartesian4.unpack(pixels, 0, scratchPackedDepth);
        Cartesian4.divideByScalar(packedDepth, 255.0, packedDepth);
        var depth = Cartesian4.dot(packedDepth, packedDepthScale);

        var camera = this._camera;
        var rayDepth = camera.near + depth * (camera.far - camera.near);
        Ray.getPoint(this.)
        Cartesian3.add(camera.positionWC, Cartesian3.multiplyByScalar(camera.directionWC, rayDepth, result), result);
    };

    Picker.prototype.isDestroyed = function() {
        return false;
    };

    Picker.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return Picker;
});
