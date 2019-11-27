import { ComponentType, BodyShape } from '../enums';
import Component from './Component';
import Attribute from './Attribute';
import SelectInput from '../dynamic_input/SelectInput';
import Checkbox from '../dynamic_input/Checkbox';
import SizeInput from '../dynamic_input/SizeInput';

interface SolidBodyComponentData {
  size?: Dimensions | number;
  shape?: BodyShape;
  isStatic?: boolean;
}

export default class SolidBodyComponent extends Component {
  public name: ComponentType = ComponentType.SOLID_BODY;

  public size: Attribute<Dimensions, SizeInput>;

  public shape: Attribute<BodyShape>;

  public isStatic: Attribute<boolean, Checkbox>;

  protected maxAmount = 1;

  public constructor(data: SolidBodyComponentData) {
    super();
    if (typeof data.size === 'number') {
      this.size = new Attribute(
        { width: data.size, height: data.size },
        SizeInput.create({ label: 'Größe', min: 20, max: 500 }),
      );
    } else {
      this.size = new Attribute(
        data.size || { width: 50, height: 50 },
        SizeInput.create({ label: 'Größe', min: 20, max: 500 }),
      );
    }
    this.shape = new Attribute(
      data.shape || BodyShape.RECTANGLE
    );
    this.isStatic = new Attribute(data.isStatic || false, Checkbox.create({ label: 'Statisch' }));
  }
  public setShape(shape){
	console.log('set shape' + shape);
	switch (shape) {
		case 'circle': {
			this.shape.value = BodyShape.CIRCLE;
			break;
		}
		case 'rectangle': {
			this.shape.value = BodyShape.RECTANGLE;
			break;
		}
	}
	
	console.log(this.shape);
	
	}
}


