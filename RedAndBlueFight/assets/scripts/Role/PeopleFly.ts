import { _decorator, Component, Node, instantiate, CCObject, Vec3, animation, SkeletalAnimation, BoxCollider, ITriggerEvent, v3, tween, Tween, RigidBody, SphereCollider, CapsuleCollider, game, Collider, ICollisionEvent, physics, ParticleSystem } from 'cc';
import { BulletPool } from '../Manager/BulletPool';
import { GameData } from '../Manager/GameData';
import { TEAM } from '../Manager/GameManager';
import { PrefabManager } from '../Manager/PrefabManager';
import Tools from '../Tools';
import { Base } from './Base';


const PeopleFlyMaxHp: number = 120;
const PeopleFlyAtk: number = 17;
const PeopleFlyAtkInterval: number = 1;
const PeopleFlyAtkDistance: number = 30;
const PeopleFlyMoveSpeed: number = 20;

export class PeopleFly {

    role: Node;
    team: TEAM;
    hp: number;
    maxHp: number;
    atk: number;
    atkInterval: number;
    atkDistance: number;
    anim: SkeletalAnimation;
    rigbody: RigidBody;
    trgCollider: SphereCollider;
    phyCollider: CapsuleCollider;
    fireEf: ParticleSystem;
    enemyBase: Base;
    isAtking: boolean;
    isDie: boolean;

    constructor(team: TEAM, parent: Node, bornPos: Vec3, enemyBase: Base, scale: Vec3) {
        let prefab = team == TEAM.RED ? PrefabManager.prefab_red_people_fly : PrefabManager.prefab_blue_people_fly;
        let people = instantiate(prefab);
        people.setScale(scale);
        people.parent = parent;
        people.position = bornPos;

        this.role = people;
        this.role.on("hit", this.hit, this);
        this.team = team;
        this.maxHp = PeopleFlyMaxHp;
        this.hp = this.maxHp;
        this.atk = PeopleFlyAtk;
        this.atkInterval = PeopleFlyAtkInterval;
        this.atkDistance = PeopleFlyAtkDistance;
        this.enemyBase = enemyBase;
        this.anim = this.role.getComponent(SkeletalAnimation);
        this.fireEf = this.role.getChildByName("Gun").getChildByName("Fire").getComponent(ParticleSystem);
        this.rigbody = this.role.getComponent(RigidBody);
        this.phyCollider = this.role.getComponent(CapsuleCollider);
        this.trgCollider = this.role.getComponent(SphereCollider);
        this.trgCollider.on("onTriggerStay", this.onTriggerStay, this);
        this.trgCollider.on("onTriggerExit", this.onTriggerExit, this);
        this.phyCollider.on("onTriggerStay", this.onBoom, this);
        this.isAtking = false;
        this.isDie = false;
        this.move();
        game.on("over", () => {
            this.die();
        }, this);
    }

    moveInterval;
    move() {
        if (this.isDie) {
            return;
        }
        console.log("fly移动");
        let temp = this.team == TEAM.RED ? 1 : -1;
        this.rigbody.linearDamping = 0;
        this.moveInterval = setInterval(() => {
            if (this.currentTrigger) {
                return;
            }
            if (this.isDie) {
                clearInterval(this.moveInterval);
                return;
            }
            this.anim.play("fly_atk");
            let enemyTeamInfo = this.team == TEAM.RED ? GameData.getInstance().blueTeam : GameData.getInstance().redTeam;
            if (enemyTeamInfo.roles.length > 0) {
                let enemyNodes: Node[] = [];
                for (let role of enemyTeamInfo.roles) {
                    enemyNodes.push(role.role);
                }
                let targetNode = Tools.findClosestNode(this.role, enemyNodes);
                let dir = Vec3.normalize(new Vec3(), Vec3.subtract(new Vec3(), targetNode.position, this.role.position));
                let linearVeloc = Vec3.multiplyScalar(new Vec3(), dir, PeopleFlyMoveSpeed);
                this.rigbody.setLinearVelocity(new Vec3(linearVeloc.x, 0, linearVeloc.z));
            } else {
                this.rigbody.setLinearVelocity(new Vec3(temp * PeopleFlyMoveSpeed, 0, 0));
            }
        }, 1000, this);
    }


    currentTrigger: Collider = null;
    onTriggerStay(event: ITriggerEvent) {
        if (this.currentTrigger || event.otherCollider.getGroup() == event.selfCollider.getGroup() || (event.otherCollider.isTrigger && event.otherCollider.type != physics.EColliderType.BOX) || event.otherCollider.node.name == "boom_1" || event.otherCollider.node.name == "boom_3") {
            return;
        }
        this.currentTrigger = event.otherCollider;
        this.rigbody.linearDamping = 1;
        this.anim.stop();
        this.doAtk(event.otherCollider.node);
    }

    onTriggerExit(event: ITriggerEvent) {
        if (this.currentTrigger == event.otherCollider) {
            this.currentTrigger = null;
            this.rigbody.linearDamping = 0;
        }
    }

    onBoom(event: ICollisionEvent) {
        if (event.otherCollider.node.name == "boom_1") {
            console.log("被炸到了");
            this.die();
        }
    }


    atkCall;
    doAtk(target: Node) {
        this.atkCall = setInterval(() => {
            if (!target.isValid || this.isDie) {
                this.currentTrigger = null;
                this.rigbody.linearDamping = 0;
                clearInterval(this.atkCall)
                return;
            }
            this.fireEf.play();
            if (target.isValid && !this.isDie) {
                target.emit("hit", this.atk);
                let startPos = Tools.convertToNodePos(this.role.parent, this.fireEf.node);
                BulletPool.getInstance().shotBullet_0(startPos, target.position, this.role.parent, () => {
                    if (!target.isValid || this.isDie) {
                        this.currentTrigger = null;
                        this.rigbody.linearDamping = 0;
                        clearInterval(this.atkCall)
                        return;
                    }
                    if (target.name == "RedBase" || target.name == "BlueBase") {
                        target.emit("hit", this.atk);
                    }
                });
            }
        }, this.atkInterval * 1000, this);

    }

    hit(atkValue: number) {
        if (this.isDie) {
            return;
        }
        console.log("受到攻击");
        this.hp -= atkValue;
        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        console.log("死亡:", this.role.name);
        GameData.getInstance().removeRoleFromTeam(this, this.team);
        this.isDie = true;
        this.currentTrigger = null;
        if (this.role.isValid) {
            this.trgCollider.off("onTriggerStay");
            this.trgCollider.off("onTriggerExit");
            this.role.destroy();
        }
        clearInterval(this.atkCall);
        clearInterval(this.moveInterval);
    }

}

