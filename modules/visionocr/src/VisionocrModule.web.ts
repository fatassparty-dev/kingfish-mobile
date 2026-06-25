import { registerWebModule, NativeModule } from 'expo';

class VisionocrModule extends NativeModule<{}> {}

export default registerWebModule(VisionocrModule, 'VisionocrModule');
