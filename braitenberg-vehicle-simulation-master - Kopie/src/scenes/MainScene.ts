import Phaser from 'phaser';
import swal from 'sweetalert';

import SettingScene from './SettingScene';

import SolidBodyComponent from '../components/SolidBodyComponent';
import RenderComponent from '../components/RenderComponent';
import MotorComponent from '../components/MotorComponent';
import SensorComponent from '../components/SensorComponent';
import SourceComponent from '../components/SourceComponent';
import TransformableComponent from '../components/TransformableComponent';
import ConnectionComponent from '../components/ConnectionComponent';

import Entity from '../Entity';

import EventBus from '../EventBus';
import System from '../systems/System';
import PhysicsSystem from '../systems/PhysicsSystem';
import RenderSystem from '../systems/RenderSystem';
import EngineSystem from '../systems/EngineSystem';
import SensorSystem from '../systems/SensorSystem';
import MotorSystem from '../systems/MotorSystem';

import ConnectionSystem from '../systems/ConnectionSystem';
import SourceSystem from '../systems/SourceSystem';
import { SubstanceType, EventType, BodyShape, EmissionType } from '../enums';
import ReactionSystem from '../systems/ReactionSystem';
import EntityManager from '../EntityManager';

export default class MainScene extends Phaser.Scene {
  private systems: System[] = [];

  private running: boolean = false;

  public constructor() {
    super({ key: 'MainScene' });
  }

  public create(): void {
    this.createSystems();
    this.pause(true);
    this.scene.launch('MainInterfaceScene');

    // Anpassen der Szene an aktuelle Bildschirmgröße
    this.scale.on('resize', this.handleResize.bind(this));
    this.matter.world.setBounds();

    this.scene.add('settings', SettingScene, false);
    
    EventBus.subscribe(EventType.ENTITY_SELECTED, (entity: Entity) => {
        var event = new CustomEvent("entitySelected", { detail: entity });
        event.preventDefault();
        // event to catch in html
      document.dispatchEvent(event);
    });

	//Barrier
    EntityManager.createEntity(
      new TransformableComponent({ position: { x: 800, y: 450 }, angle: Math.PI }),
      new SolidBodyComponent({
        size: { width: 20, height: 400 },
        shape: BodyShape.RECTANGLE,
        isStatic: true,
      }),
      new SourceComponent({
        range: 100,
        substance: SubstanceType.BARRIER,
        emissionType: EmissionType.FLAT,
      }),
      new RenderComponent({
        asset: 0xcccccc,
        size: { width: 20, height: 400 },
        shape: BodyShape.RECTANGLE,
      }),
    );

	//Vehicle
    const entity = new Entity();
    const transform = new TransformableComponent({
      position: { x: 100, y: 500 },
    });
    transform.angle.set(-Math.PI / 2);
    entity.addComponent(transform);
    entity.addComponent(
      new SolidBodyComponent({
        size: { width: 100, height: 150 },
      }),
    );
	entity.addComponent(
      new SourceComponent({
        range: 0,
      }),
    );
    entity.addComponent(
      new RenderComponent({
        asset: 'vehicle',
        size: { width: 100, height: 150 },
      }),
    );
    const motor1 = entity.addComponent(
      new MotorComponent({
        position: { x: -50, y: 0 },
        maxSpeed: 30,
        defaultSpeed: 1,
      }),
    );
    const motor2 = entity.addComponent(
      new MotorComponent({
        position: { x: 50, y: 0 },
        maxSpeed: 30,
        defaultSpeed: 1,
      }),
      );

    const sensor1 = entity.addComponent(
      new SensorComponent({
        position: { x: -50, y: 50 },
        range: 20,
        angle: 0.4,
      }),
    );
    const sensor2 = entity.addComponent(
      new SensorComponent({
        position: { x: 50, y: 50 },
        range: 20,
        angle: 0.4,
      }),
    );
    const sensor3 = entity.addComponent(
      new SensorComponent({
        position: { x: -50, y: 75 },
        range: 30,
        angle: 0.4,
        reactsTo: SubstanceType.BARRIER,
      }),
    );
    const sensor4 = entity.addComponent(
      new SensorComponent({
        position: { x: 50, y: 75 },
        range: 30,
        angle: 0.4,
        reactsTo: SubstanceType.BARRIER,
      }),
    );
    entity.addComponent(
      new ConnectionComponent({
        inputIds: [sensor1, sensor2, sensor3, sensor4],
        outputIds: [motor1, motor2],
        weights: [[0, 1], [1, 0], [1, 0], [0, 1]],
      }),
    );
    EntityManager.addExistingEntity(entity);


	//Source
    EntityManager.createEntity(
        new TransformableComponent({ position: { x: 950, y: 350 }}),
      new RenderComponent({
        asset: 'prefab-source',
        size: { width: 50, height: 50 },
        shape: BodyShape.CIRCLE,
      }),
      new SourceComponent({
        range: 200,
      }),
    );
  }

  private createSystems(): void {
    this.systems = [
      new PhysicsSystem(this),
      new SourceSystem(this),
      new EngineSystem(this),
      new SensorSystem(this),
      new MotorSystem(this),
      new ConnectionSystem(this),
      new ReactionSystem(this),
      new RenderSystem(this),
    ];
  }

  public update(time: number, delta: number): void {
    this.systems.forEach(s => s.update(delta));
  }

  public isRunning(): boolean {
    return this.running;
  }

  public pause(flag: boolean): void {
    this.running = flag;
    this.systems.forEach(s => s.pause(flag));

    // Wenn die Szene gestartet wird (play), wird ein neuer Snapshot erzeugt.
    if (flag) {
      MainScene.createSnapshot();
    }
  }

  // Speicherung des aktuellen Status von allen Entitäten
  public static createSnapshot(): void {
    const entities = EntityManager.getEntities();
    const snapshot = entities.map(entity => entity.serialize());

    localStorage.setItem('snapshot', JSON.stringify(snapshot));
  }

  public static loadSnapshot(): void {
    const entities = EntityManager.getEntities();

    const snapshot = localStorage.getItem('snapshot');

    let aktuellerStatus;
    if (snapshot) {
      aktuellerStatus = JSON.parse(snapshot) as SerializedEntity[];
      entities.forEach(entity => EntityManager.destroyEntity(entity.id));
      EntityManager.loadEntities(aktuellerStatus);
    } else {
      swal('No scene could be loaded! Please use the save button first.');
    }
  }

  public static exportJson(): void {
    const entities = EntityManager.getEntities();
    const snapshot = entities.map(entity => entity.serialize());
    const dataStr = JSON.stringify(snapshot);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportfkt = document.createElement('a');
    exportfkt.setAttribute('href', dataUri);
    exportfkt.setAttribute('download', 'data.json');
    document.body.append(exportfkt);
    exportfkt.click();
    exportfkt.remove();
  }

  public static importJson(): void {
    const entities = EntityManager.getEntities();
    const importEl = document.createElement('input');
    importEl.type = 'file';
    importEl.accept = 'application/json';

    importEl.addEventListener('change', () => {
      const files = importEl.files || [];

      if (files.length <= 0) {
        swal('No correct file was selected.');
        return;
      }
      const fr = new FileReader();
      fr.addEventListener('load', () => {
        if (fr.result === null) return;

        const result = JSON.parse(fr.result as string) as SerializedEntity[];
        entities.forEach(entity => EntityManager.destroyEntity(entity.id));
        EntityManager.loadEntities(result);
      });

      fr.readAsText(files[0]);
    });

    importEl.click();
  }

  private handleResize(): void {
    this.matter.world.setBounds();
  }

  // create entities for mainscene
  public createBarrier(mouseX: number, mouseY: number): void {
    EntityManager.createEntity(
        new TransformableComponent({ position: { x: mouseX, y: mouseY } }),
        new SolidBodyComponent({
            size: { width: 20, height: 400 },
            shape: BodyShape.RECTANGLE,
            isStatic: true,
        }),
        new SourceComponent({
            range: 50,
            substance: SubstanceType.BARRIER,
            emissionType: EmissionType.FLAT,
        }),
        new RenderComponent({
            asset: 0xcccccc,
			size: { width: 20, height: 400 },
			shape: BodyShape.RECTANGLE
        }),
    );
}

  private createBlank(mouseX: number, mouseY: number): void {
	EntityManager.createEntity(
	
        new TransformableComponent({ position: { x: mouseX, y: mouseY }}),
        new RenderComponent({
            asset: 'prefab-blank',
            size: { width: 100, height: 100 },
			shape: BodyShape.CIRCLE
        }),
		new SourceComponent({
        range: 0,
        })
    );   
}
  private createSource(mouseX: number, mouseY: number): void {
	EntityManager.createEntity(
        new TransformableComponent({ position: { x: mouseX, y: mouseY }}),
        new SourceComponent({
          range: 100,
        }),
        new RenderComponent({ asset: 'prefab-source',         
		size: { width: 100, height: 100 },
        shape: BodyShape.CIRCLE }),
      );
   
}
  private createPrefab2a(mouseX: number, mouseY: number): void {
	  const entity = new Entity();
      const transform = new TransformableComponent({
        position: { x: mouseX, y: mouseY },
        angle: Math.PI,
      });
      entity.addComponent(transform);
	  entity.addComponent(
      new SourceComponent({
        range: 0,
      }),
      );
      entity.addComponent(
        new SolidBodyComponent({
          size: { width: 100, height: 150 },
        }),
      );
      entity.addComponent(
        new RenderComponent({
          asset: 'vehicle',
          size: { width: 100, height: 150 },
	      shape: BodyShape.RECTANGLE
        }),
      );
      const motor1 = entity.addComponent(
        new MotorComponent({
          position: { x: -50, y: 0 },
          maxSpeed: 30,
          defaultSpeed: 1,
        }),
      );
      const motor2 = entity.addComponent(
        new MotorComponent({
          position: { x: 50, y: 0 },
          maxSpeed: 30,
          defaultSpeed: 1,
        }),
      );
      const sensor1 = entity.addComponent(
        new SensorComponent({
          position: { x: -50, y: 75 },
          range: 20,
          angle: 0.4,
        }),
      );
      const sensor2 = entity.addComponent(
        new SensorComponent({
          position: { x: 50, y: 75 },
          range: 20,
          angle: 0.4,
        }),
      );
      entity.addComponent(
        new ConnectionComponent({
          inputIds: [sensor1, sensor2],
          outputIds: [motor1, motor2],
          weights: [[1, 0], [0, 1]],
        }),
      );
      EntityManager.addExistingEntity(entity);
   
}
  private createPrefab2b(mouseX: number, mouseY: number): void {
	  const entity = new Entity();
      const transform = new TransformableComponent({
        position: { x: mouseX, y: mouseY },
        angle: Math.PI,
      });
      //transform.angle.set(-Math.PI / 2);
      entity.addComponent(transform);
	  entity.addComponent(
      new SourceComponent({
        range: 0,
      }),
      );
      entity.addComponent(
        new SolidBodyComponent({
          size: { width: 100, height: 150 },
        }),
      );
      entity.addComponent(
        new RenderComponent({
          asset: 'vehicle',
          size: { width: 100, height: 150 },
	      shape: BodyShape.RECTANGLE
        }),
      );
      const motor1 = entity.addComponent(
        new MotorComponent({
          position: { x: -50, y: 0 },
          maxSpeed: 30,
          defaultSpeed: 1,
        }),
      );
      const motor2 = entity.addComponent(
        new MotorComponent({
          position: { x: 50, y: 0 },
          maxSpeed: 30,
          defaultSpeed: 1,
        }),
      );
      const sensor1 = entity.addComponent(
        new SensorComponent({
          position: { x: -50, y: 75 },
          range: 20,
          angle: 0.4,
        }),
      );
      const sensor2 = entity.addComponent(
        new SensorComponent({
          position: { x: 50, y: 75 },
          range: 20,
          angle: 0.4,
        }),
      );
      entity.addComponent(
        new ConnectionComponent({
          inputIds: [sensor1, sensor2],
          outputIds: [motor1, motor2],
          weights: [[0, 1], [1, 0]],
        }),
      );
      EntityManager.addExistingEntity(entity);
   
}
  private createPrefab3a(mouseX: number, mouseY: number): void {
      const entity = new Entity();
      const transform = new TransformableComponent({
        position: { x: mouseX, y: mouseY },
        angle: Math.PI,
      });
      //transform.angle.set(-Math.PI / 2);
      entity.addComponent(transform);
	  entity.addComponent(
      new SourceComponent({
        range: 0,
      }),
      );
      entity.addComponent(
        new SolidBodyComponent({
          size: { width: 100, height: 150 },
        }),
      );
      entity.addComponent(
        new RenderComponent({
          asset: 'vehicle',
          size: { width: 100, height: 150 },
	      shape: BodyShape.RECTANGLE
        }),
      );
      const motor1 = entity.addComponent(
        new MotorComponent({
          position: { x: -50, y: 0 },
          maxSpeed: 30,
          defaultSpeed: 1,
        }),
      );
      const motor2 = entity.addComponent(
        new MotorComponent({
          position: { x: 50, y: 0 },
          maxSpeed: 30,
          defaultSpeed: 1,
        }),
      );
      const sensor1 = entity.addComponent(
        new SensorComponent({
          position: { x: -50, y: 75 },
          range: 20,
          angle: 0.4,
        }),
      );
      const sensor2 = entity.addComponent(
        new SensorComponent({
          position: { x: 50, y: 75 },
          range: 20,
          angle: 0.4,
        }),
      );
      entity.addComponent(
        new ConnectionComponent({
          inputIds: [sensor1, sensor2],
          outputIds: [motor1, motor2],
          weights: [[-1, 0], [0, -1]],
        }),
      );
      EntityManager.addExistingEntity(entity);
   
}
  private createPrefab3b(mouseX: number, mouseY: number): void {
      const entity = new Entity();
      const transform = new TransformableComponent({
        position: { x: mouseX, y: mouseY },
        angle: Math.PI,
      });
      //transform.angle.set(-Math.PI / 2);
      entity.addComponent(transform);
	  entity.addComponent(
      new SourceComponent({
        range: 0,
      }),
      );
      entity.addComponent(
        new SolidBodyComponent({
          size: { width: 100, height: 150 },
        }),
      );
      entity.addComponent(
        new RenderComponent({
          asset: 'vehicle',
          size: { width: 100, height: 150 },
	      shape: BodyShape.RECTANGLE
        }),
      );
      const motor1 = entity.addComponent(
        new MotorComponent({
          position: { x: -50, y: 0 },
          maxSpeed: 30,
          defaultSpeed: 1,
        }),
      );
      const motor2 = entity.addComponent(
        new MotorComponent({
          position: { x: 50, y: 0 },
          maxSpeed: 30,
          defaultSpeed: 1,
        }),
      );
      const sensor1 = entity.addComponent(
        new SensorComponent({
          position: { x: -50, y: 75 },
          range: 20,
          angle: 0.4,
        }),
      );
      const sensor2 = entity.addComponent(
        new SensorComponent({
          position: { x: 50, y: 75 },
          range: 20,
          angle: 0.4,
        }),
      );
      entity.addComponent(
        new ConnectionComponent({
          inputIds: [sensor1, sensor2],
          outputIds: [motor1, motor2],
          // TO-DO Negative Verknüpfung umsetzen
          weights: [[0, -1], [-1, 0]],
        }),
      );
      EntityManager.addExistingEntity(entity);
   
}

  public createObject(mouseX: number, mouseY: number, droppedItemID: number ) {
	switch(droppedItemID) { 
		case 'blank': { 
			this.createBlank(mouseX, mouseY);
			break; 
		}
		case 'source': { 
			this.createSource(mouseX, mouseY);
			break; 
		} 
		case 'prefab2a': { 
			this.createPrefab2a(mouseX, mouseY);
			break; 
		}		 
		case 'prefab2b': { 
			this.createPrefab2b(mouseX, mouseY);
			break; 
		} 
		case 'prefab3a': { 
			this.createPrefab3a(mouseX, mouseY);
			break; 
		} 
		case 'prefab3b': { 
			this.createPrefab3b(mouseX, mouseY);
			break; 
		} 
		case 'barrier': { 
			this.createBarrier(mouseX, mouseY);
			break; 
		}	
    }
}
}
